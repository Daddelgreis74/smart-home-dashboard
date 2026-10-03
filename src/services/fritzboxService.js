const http = require('http');
const net = require('net');
const crypto = require('crypto');
const fileStore = require('../utils/fileStore');

const TR064_PORT = 49000;
const CALLMONITOR_PORT = 1012;
const SOAP_TIMEOUT_MS = 3000;
const TCP_PING_TIMEOUT_MS = 1200;
const CALLMONITOR_RECONNECT_DELAY_MS = 15000;
const MAX_STORED_CALLS = 10;

let callMonitorSocket = null;
let reconnectTimeout = null;
let isPresencePolling = false;
let ioInstance = null; // Gespeicherte Socket.io-Instanz für Broadcasts

function setIoInstance(io) {
  ioInstance = io;
}

function md5(str) {
  return crypto.createHash('md5').update(str).digest('hex');
}

function parseDigestHeader(header) {
  const params = {};
  const regex = /(\w+)="?([^",]+)"?/g;
  let match;
  while ((match = regex.exec(header)) !== null) {
    params[match[1]] = match[2];
  }
  return params;
}

function calculateDigest(username, password, realm, nonce, method, uri) {
  const ha1 = md5(`${username}:${realm}:${password}`);
  const ha2 = md5(`${method}:${uri}`);
  const response = md5(`${ha1}:${nonce}:${ha2}`);
  return `Digest username="${username}", realm="${realm}", nonce="${nonce}", uri="${uri}", response="${response}"`;
}

function soapCall(ip, path, service, action, args, auth = null) {
  return new Promise((resolve, reject) => {
    let argXml = '';
    for (const [key, val] of Object.entries(args)) {
      argXml += `<${key}>${val}</${key}>`;
    }

    const xml = `<?xml version="1.0" encoding="utf-8"?>
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">
  <s:Body>
    <u:${action} xmlns:u="${service}">
      ${argXml}
    </u:${action}>
  </s:Body>
</s:Envelope>`;

    const headers = {
      'Content-Type': 'text/xml; charset="utf-8"',
      'SOAPACTION': `"${service}#${action}"`,
      'Content-Length': Buffer.byteLength(xml)
    };

    if (auth) {
      headers['Authorization'] = auth;
    }

    const req = http.request({
      host: ip,
      port: TR064_PORT,
      path: path,
      method: 'POST',
      headers: headers,
      timeout: SOAP_TIMEOUT_MS
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 401) {
          const authHeader = res.headers['www-authenticate'];
          resolve({ status: 401, header: authHeader });
        } else if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ status: res.statusCode, body: data });
        } else {
          resolve({ status: res.statusCode, error: data });
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('SOAP request timeout'));
    });

    req.write(xml);
    req.end();
  });
}

let fritzDataCache = {
  modelName: '',
  softwareVersion: '',
  uptime: 0,
  maxDown: 0,
  maxUp: 0,
  linkStatus: '',
  guestWifi: {
    enabled: false,
    ssid: '',
    status: '',
    key: ''
  },
  phonebook: [],
  lastRefreshed: 0
};

async function callTr064(path, service, action, args = {}) {
  const fritzConfig = fileStore.fritzConfig;
  if (!fritzConfig || !fritzConfig.ip) return { status: 400, error: 'Keine Fritz!Box konfiguriert' };
  const username = fritzConfig.user || 'admin';
  const password = fritzConfig.pass || '';

  let res = await soapCall(fritzConfig.ip, path, service, action, args);
  if (res.status === 401 && res.header) {
    const params = parseDigestHeader(res.header);
    const auth = calculateDigest(username, password, params.realm, params.nonce, 'POST', path);
    res = await soapCall(fritzConfig.ip, path, service, action, args, auth);
  }
  return res;
}

function httpGet(urlStr) {
  return new Promise((resolve, reject) => {
    http.get(urlStr, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function normalizeNumber(num) {
  if (!num) return '';
  let clean = String(num).replace(/[^\d+]/g, '');
  if (clean.startsWith('+49')) clean = '0' + clean.slice(3);
  else if (clean.startsWith('0049')) clean = '0' + clean.slice(4);
  else if (clean.startsWith('49') && clean.length > 9) clean = '0' + clean.slice(2);
  return clean;
}

function resolveCallerName(rawNumber) {
  if (!rawNumber) return 'Unbekannter Anrufer';
  const clean = normalizeNumber(rawNumber);
  if (!clean) return String(rawNumber);

  for (const contact of fritzDataCache.phonebook) {
    for (const num of contact.numbers) {
      const cleanNum = normalizeNumber(num);
      if (clean === cleanNum || (clean.length >= 6 && cleanNum.endsWith(clean)) || (cleanNum.length >= 6 && clean.endsWith(cleanNum))) {
        return contact.name;
      }
    }
  }
  return String(rawNumber);
}

async function refreshPhonebook() {
  try {
    const pbRes = await callTr064('/upnp/control/x_contact', 'urn:dslforum-org:service:X_AVM-DE_OnTel:1', 'GetPhonebook', { NewPhonebookID: 0 });
    if (pbRes.status === 200 && pbRes.body) {
      const urlMatch = pbRes.body.match(/<NewPhonebookURL>([^<]+)<\/NewPhonebookURL>/);
      if (urlMatch) {
        const rawUrl = urlMatch[1].replace(/&amp;/g, '&');
        const xml = await httpGet(rawUrl);
        const contacts = [];
        const contactRegex = /<contact>([\s\S]+?)<\/contact>/g;
        let m;
        while ((m = contactRegex.exec(xml)) !== null) {
          const c = m[1];
          const nameMatch = c.match(/<realName>([^<]+)<\/realName>/);
          const name = nameMatch ? nameMatch[1] : '';
          const numbers = [];
          const numRegex = /<number[^>]*>([^<]+)<\/number>/g;
          let nm;
          while ((nm = numRegex.exec(c)) !== null) {
            numbers.push(nm[1].replace(/\s+/g, ''));
          }
          if (name && numbers.length > 0) {
            contacts.push({ name, numbers });
          }
        }
        fritzDataCache.phonebook = contacts;
        console.log(`[Fritz!Box] Telefonbuch aktualisiert: ${contacts.length} Kontakte geladen.`);
      }
    }
  } catch (err) {
    console.warn('[Fritz!Box] Fehler beim Laden des Telefonbuchs:', err.message);
  }
}

async function refreshFritzData() {
  const fritzConfig = fileStore.fritzConfig;
  if (!fritzConfig || !fritzConfig.ip) return;

  try {
    // 1. Device Info
    const dev = await callTr064('/upnp/control/deviceinfo', 'urn:dslforum-org:service:DeviceInfo:1', 'GetInfo');
    if (dev.status === 200 && dev.body) {
      const model = dev.body.match(/<NewModelName>([^<]+)<\/NewModelName>/);
      const sw = dev.body.match(/<NewSoftwareVersion>([^<]+)<\/NewSoftwareVersion>/);
      const uptime = dev.body.match(/<NewUpTime>([^<]+)<\/NewUpTime>/);
      if (model) fritzDataCache.modelName = model[1];
      if (sw) fritzDataCache.softwareVersion = sw[1];
      if (uptime) fritzDataCache.uptime = Number(uptime[1]);
    }

    // 2. WAN Link Properties
    const link = await callTr064('/upnp/control/wancommonifconfig1', 'urn:dslforum-org:service:WANCommonInterfaceConfig:1', 'GetCommonLinkProperties');
    if (link.status === 200 && link.body) {
      const down = link.body.match(/<NewLayer1DownstreamMaxBitRate>([^<]+)<\/NewLayer1DownstreamMaxBitRate>/);
      const up = link.body.match(/<NewLayer1UpstreamMaxBitRate>([^<]+)<\/NewLayer1UpstreamMaxBitRate>/);
      const linkStatus = link.body.match(/<NewPhysicalLinkStatus>([^<]+)<\/NewPhysicalLinkStatus>/);
      if (down) fritzDataCache.maxDown = Number(down[1]);
      if (up) fritzDataCache.maxUp = Number(up[1]);
      if (linkStatus) fritzDataCache.linkStatus = linkStatus[1];
    }

    // 3. Guest WiFi Info
    const wlan = await callTr064('/upnp/control/wlanconfig3', 'urn:dslforum-org:service:WLANConfiguration:3', 'GetInfo');
    if (wlan.status === 200 && wlan.body) {
      const enabled = wlan.body.match(/<NewEnable>([^<]+)<\/NewEnable>/);
      const ssid = wlan.body.match(/<NewSSID>([^<]+)<\/NewSSID>/);
      const status = wlan.body.match(/<NewStatus>([^<]+)<\/NewStatus>/);
      fritzDataCache.guestWifi.enabled = enabled ? enabled[1] === '1' : false;
      if (ssid) fritzDataCache.guestWifi.ssid = ssid[1];
      if (status) fritzDataCache.guestWifi.status = status[1];
    }

    // 4. Guest WiFi Key
    if (!fritzDataCache.guestWifi.key) {
      const sec = await callTr064('/upnp/control/wlanconfig3', 'urn:dslforum-org:service:WLANConfiguration:3', 'GetSecurityKeys');
      if (sec.status === 200 && sec.body) {
        const key = sec.body.match(/<NewKeyPassphrase>([^<]+)<\/NewKeyPassphrase>/);
        if (key) fritzDataCache.guestWifi.key = key[1];
      }
    }

    // 5. Phonebook (beim ersten Mal oder wenn leer)
    if (fritzDataCache.phonebook.length === 0) {
      await refreshPhonebook();
    }

    fritzDataCache.lastRefreshed = Date.now();
  } catch (err) {
    console.warn('[Fritz!Box] Fehler bei refreshFritzData:', err.message);
  }
}

async function setGuestWifi(enable) {
  const fritzConfig = fileStore.fritzConfig;
  if (!fritzConfig || !fritzConfig.ip) throw new Error('Keine Fritz!Box konfiguriert');

  const res = await callTr064('/upnp/control/wlanconfig3', 'urn:dslforum-org:service:WLANConfiguration:3', 'SetEnable', {
    NewEnable: enable ? 1 : 0
  });

  if (res.status === 200) {
    fritzDataCache.guestWifi.enabled = !!enable;
    fritzDataCache.guestWifi.status = enable ? 'Enabled' : 'Disabled';
    if (ioInstance) {
      ioInstance.emit('fritz-guest-wifi', {
        enabled: fritzDataCache.guestWifi.enabled,
        ssid: fritzDataCache.guestWifi.ssid
      });
    }
    return { success: true, enabled: fritzDataCache.guestWifi.enabled, ssid: fritzDataCache.guestWifi.ssid };
  } else {
    throw new Error(`TR-064 Fehler: ${res.status}`);
  }
}

function getFritzExtraData() {
  return {
    modelName: fritzDataCache.modelName || 'FRITZ!Box',
    softwareVersion: fritzDataCache.softwareVersion,
    maxDown: fritzDataCache.maxDown,
    maxUp: fritzDataCache.maxUp,
    linkStatus: fritzDataCache.linkStatus,
    guestWifi: {
      enabled: fritzDataCache.guestWifi.enabled,
      ssid: fritzDataCache.guestWifi.ssid,
      status: fritzDataCache.guestWifi.status
    }
  };
}

function addOrUpdateCall(connectionId, data) {
  fileStore.activeCalls[connectionId] = data;
  if (ioInstance) {
    ioInstance.emit('fritz-calls', getMergedCalls());
  }
}

function addCallToLog(call) {
  fileStore.fritzCalls.unshift({
    type: call.type === 'CONNECTED' ? 'RING' : call.type,
    number: call.number,
    time: call.time,
    duration: call.duration,
    callerName: call.callerName || resolveCallerName(call.number)
  });
  fileStore.fritzCalls = fileStore.fritzCalls.slice(0, MAX_STORED_CALLS);
  fileStore.saveCallLog();
  if (ioInstance) {
    ioInstance.emit('fritz-calls', fileStore.fritzCalls);
  }
}

function getMergedCalls() {
  const current = Object.values(fileStore.activeCalls).map(c => ({
    type: c.type,
    number: c.number,
    time: c.time,
    duration: 0,
    callerName: c.callerName || resolveCallerName(c.number) || (c.type === 'RING' ? 'Klingelt...' : 'Verbunden')
  }));
  const history = fileStore.fritzCalls.map(c => ({
    ...c,
    callerName: (!c.callerName || c.callerName === 'Unbekannter Anrufer' || c.callerName === c.number)
      ? resolveCallerName(c.number)
      : c.callerName
  }));
  return [...current, ...history].slice(0, MAX_STORED_CALLS);
}

function pingTcp(host, port, timeout = TCP_PING_TIMEOUT_MS) {
  return new Promise((resolve) => {
    const start = Date.now();
    const socket = new net.Socket();
    socket.setTimeout(timeout);
    
    let resolved = false;
    const done = (status) => {
      if (resolved) return;
      resolved = true;
      socket.destroy();
      const latency = Date.now() - start;
      resolve({ online: status, latency });
    };

    socket.connect(port, host, () => done(true));
    socket.on('error', () => done(false));
    socket.on('timeout', () => done(false));
  });
}

function connectFritzCallMonitor() {
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }

  if (callMonitorSocket) {
    try { callMonitorSocket.destroy(); } catch(e) {}
    callMonitorSocket = null;
  }

  const fritzConfig = fileStore.fritzConfig;
  if (!fritzConfig.callMonitorEnabled || !fritzConfig.ip) {
    console.log('[Fritz!Box] CallMonitor ist deaktiviert.');
    return;
  }

  console.log(`[Fritz!Box] Verbinde mit CallMonitor auf ${fritzConfig.ip}:${CALLMONITOR_PORT}...`);
  callMonitorSocket = net.createConnection({ host: fritzConfig.ip, port: CALLMONITOR_PORT });

  callMonitorSocket.on('connect', () => {
    console.log('[Fritz!Box] Live-CallMonitor erfolgreich verbunden!');
    if (ioInstance) {
      ioInstance.emit('fritz-calls', getMergedCalls());
    }
  });

  callMonitorSocket.on('data', (data) => {
    const lines = data.toString('utf8').split('\n');
    lines.forEach(line => {
      const parts = line.trim().split(';');
      if (parts.length < 2) return;
      
      const type = parts[1];
      const connectionId = parts[2];
      const nowTime = new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

      if (type === 'RING') {
        const callerNumber = parts[3];
        const dialedNumber = parts[4];
        const callerName = resolveCallerName(callerNumber);
        console.log(`[Fritz!Box] RING - Anruf von ${callerNumber} (${callerName})`);
        
        if (ioInstance) {
          ioInstance.emit('fritz-ringing', {
            active: true,
            number: callerNumber,
            callerName: callerName !== callerNumber ? callerName : 'Eingehender Anruf'
          });
        }

        addOrUpdateCall(connectionId, {
          type: 'RING',
          number: callerNumber,
          callerName: callerName,
          dialed: dialedNumber,
          time: nowTime,
          duration: 0,
          active: true
        });
      } 
      else if (type === 'CALL') {
        const dialedNumber = parts[4];
        const internalLine = parts[3];
        const callerName = resolveCallerName(dialedNumber);
        console.log(`[Fritz!Box] CALL - Ausgehend zu ${dialedNumber} (${callerName})`);

        addOrUpdateCall(connectionId, {
          type: 'CALL',
          number: dialedNumber,
          callerName: callerName,
          dialed: internalLine,
          time: nowTime,
          duration: 0,
          active: true
        });
      }
      else if (type === 'CONNECT') {
        console.log(`[Fritz!Box] CONNECT - Verbindung hergestellt bei ID ${connectionId}`);
        if (ioInstance) {
          ioInstance.emit('fritz-ringing', { active: false });
        }

        const call = fileStore.activeCalls[connectionId];
        if (call) {
          call.type = 'CONNECTED';
          call.connectTime = Date.now();
          if (ioInstance) {
            ioInstance.emit('fritz-calls', getMergedCalls());
          }
        }
      }
      else if (type === 'DISCONNECT') {
        const duration = Number(parts[3] || 0);
        console.log(`[Fritz!Box] DISCONNECT - Gespräch beendet bei ID ${connectionId}, Dauer ${duration}s`);
        if (ioInstance) {
          ioInstance.emit('fritz-ringing', { active: false });
        }

        const call = fileStore.activeCalls[connectionId];
        if (call) {
          call.active = false;
          call.duration = duration;
          
          if (duration === 0 && call.type === 'RING') {
            call.type = 'MISSED';
          }
          if (!call.callerName || call.callerName === 'Eingehender Anruf' || call.callerName === call.number) {
            call.callerName = resolveCallerName(call.number);
          }
          
          addCallToLog(call);
          delete fileStore.activeCalls[connectionId];
        }
      }
    });
  });

  callMonitorSocket.on('error', (err) => {
    console.log(`[Fritz!Box] CallMonitor Socketfehler: ${err.message}`);
  });

  callMonitorSocket.on('close', () => {
    console.log('[Fritz!Box] CallMonitor Verbindung geschlossen. Reconnect in 15s...');
    if (!reconnectTimeout) {
      reconnectTimeout = setTimeout(() => {
        connectFritzCallMonitor();
      }, CALLMONITOR_RECONNECT_DELAY_MS);
    }
  });
}

let fritzRefreshTimer = null;

function initFritzboxConnections(io) {
  if (io) setIoInstance(io);
  fileStore.loadFritzConfig();
  connectFritzCallMonitor();
  refreshFritzData();

  if (!fritzRefreshTimer) {
    fritzRefreshTimer = setInterval(() => {
      refreshFritzData();
    }, 60000);
    if (fritzRefreshTimer && typeof fritzRefreshTimer.unref === 'function') {
      fritzRefreshTimer.unref();
    }
  }
}

async function queryFritzPresence(mac) {
  const fritzConfig = fileStore.fritzConfig;
  if (!fritzConfig || !fritzConfig.ip) return false;
  const path = '/upnp/control/hosts';
  const service = 'urn:dslforum-org:service:Hosts:1';
  const action = 'GetSpecificHostEntry';
  const args = { NewMACAddress: mac.trim().toUpperCase() };

  try {
    const res = await callTr064(path, service, action, args);
    if (res.status === 200 && res.body) {
      const activeMatch = res.body.match(/<NewActive>(\d)<\/NewActive>/i);
      if (activeMatch && activeMatch[1] === '1') {
        return true;
      }
    }
    return false;
  } catch (err) {
    return false;
  }
}

async function pollPresence() {
  if (isPresencePolling) return;
  isPresencePolling = true;

  try {
    let changed = false;
    const presenceRAM = fileStore.presenceRAM;
    for (let i = 0; i < presenceRAM.length; i++) {
      const person = presenceRAM[i];
      const isOnline = await queryFritzPresence(person.mac);
      
      if (isOnline !== person.active) {
        person.active = isOnline;
        if (isOnline) {
          const now = new Date();
          person.lastSeen = now.toLocaleDateString('de-DE') + ' ' + now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) + ' Uhr';
        }
        changed = true;
      }
    }

    if (changed) {
      fileStore.savePresence();
      if (ioInstance) {
        ioInstance.emit('presence-list-updated', presenceRAM);
        ioInstance.emit('presence-updated', presenceRAM);
      }
    }
  } catch (e) {
    console.error('[Presence] Polling Fehler:', e.message);
  } finally {
    isPresencePolling = false;
  }
}

module.exports = {
  setIoInstance,
  soapCall,
  callTr064,
  getMergedCalls,
  pingTcp,
  connectFritzCallMonitor,
  initFritzboxConnections,
  queryFritzPresence,
  pollPresence,
  refreshFritzData,
  refreshPhonebook,
  getFritzExtraData,
  getGuestWifi: () => fritzDataCache.guestWifi,
  setGuestWifi,
  resolveCallerName
};
