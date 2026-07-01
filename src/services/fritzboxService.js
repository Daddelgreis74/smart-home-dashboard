const net = require('net');
const crypto = require('crypto');
const fileStore = require('../utils/fileStore');

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

    const httpReq = require('http'); // core module
    const req = httpReq.request({
      host: ip,
      port: 49000,
      path: path,
      method: 'POST',
      headers: headers,
      timeout: 3000
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
    callerName: call.callerName || 'Unbekannter Anrufer'
  });
  fileStore.fritzCalls = fileStore.fritzCalls.slice(0, 10);
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
    callerName: c.type === 'RING' ? 'Klingelt...' : 'Verbunden'
  }));
  return [...current, ...fileStore.fritzCalls].slice(0, 10);
}

function pingTcp(host, port, timeout = 1200) {
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

  console.log(`[Fritz!Box] Verbinde mit CallMonitor auf ${fritzConfig.ip}:1012...`);
  callMonitorSocket = net.createConnection({ host: fritzConfig.ip, port: 1012 });

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
        console.log(`[Fritz!Box] RING - Anruf von ${callerNumber}`);
        
        if (ioInstance) {
          ioInstance.emit('fritz-ringing', {
            active: true,
            number: callerNumber,
            callerName: 'Eingehender Anruf'
          });
        }

        addOrUpdateCall(connectionId, {
          type: 'RING',
          number: callerNumber,
          dialed: dialedNumber,
          time: nowTime,
          duration: 0,
          active: true
        });
      } 
      else if (type === 'CALL') {
        const dialedNumber = parts[4];
        const internalLine = parts[3];
        console.log(`[Fritz!Box] CALL - Ausgehend zu ${dialedNumber}`);

        addOrUpdateCall(connectionId, {
          type: 'CALL',
          number: dialedNumber,
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
      }, 15000);
    }
  });
}

function initFritzboxConnections(io) {
  if (io) setIoInstance(io);
  fileStore.loadFritzConfig();
  connectFritzCallMonitor();
}

async function queryFritzPresence(mac) {
  const fritzConfig = fileStore.fritzConfig;
  if (!fritzConfig.ip) return false;
  const username = fritzConfig.user || 'admin';
  const password = fritzConfig.pass || '';
  const path = '/upnp/control/hosts';
  const service = 'urn:dslforum-org:service:Hosts:1';
  const action = 'GetSpecificHostEntry';
  const args = { NewMACAddress: mac.trim().toUpperCase() };

  try {
    let res = await soapCall(fritzConfig.ip, path, service, action, args);
    
    if (res.status === 401 && res.header) {
      const params = parseDigestHeader(res.header);
      const auth = calculateDigest(username, password, params.realm, params.nonce, 'POST', path);
      res = await soapCall(fritzConfig.ip, path, service, action, args, auth);
    }

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
  getMergedCalls,
  pingTcp,
  connectFritzCallMonitor,
  initFritzboxConnections,
  queryFritzPresence,
  pollPresence
};
