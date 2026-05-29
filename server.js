const express = require('express');
const net = require('net');
const https = require('https');
const { Server } = require('socket.io');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const si = require('systeminformation');
const { execFile } = require('child_process');
const crypto = require('crypto');

const app = express();
const PORT = Number(process.env.PORT || 8443);
const HOST = process.env.HOST || '0.0.0.0';

const DATA_DIR = process.env.DATA_DIR || __dirname;
const TASMOTA_FILE = path.join(DATA_DIR, 'tasmota.json');
const RADIO_FILE = path.join(DATA_DIR, 'radio.json');
const CAMERAS_FILE = path.join(DATA_DIR, 'cameras.json');
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, 'uploads');
const SSL_DIR = process.env.SSL_DIR || path.join(__dirname, 'ssl');

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const sslKeyPath = path.join(SSL_DIR, 'key.pem');
const sslCertPath = path.join(SSL_DIR, 'cert.pem');
const useSSL = fs.existsSync(sslKeyPath) && fs.existsSync(sslCertPath);

let server;
if (useSSL) {
  const sslOptions = {
    key: fs.readFileSync(sslKeyPath),
    cert: fs.readFileSync(sslCertPath)
  };
  server = https.createServer(sslOptions, app);
  console.log('SSL-Zertifikate gefunden. Starte sicheren HTTPS-Server.');
} else {
  const http = require('http');
  server = http.createServer(app);
  console.log('Keine SSL-Zertifikate in ssl/ gefunden. Starte Standard-HTTP-Server.');
}

const io = new Server(server);

app.use(express.static('public'));
app.use('/uploads', express.static(UPLOAD_DIR));
app.use(express.json({ limit: '256kb' }));

function isIPv4(value) {
  if (typeof value !== 'string') return false;
  const parts = value.trim().split('.');
  return parts.length === 4 && parts.every(part => /^\d{1,3}$/.test(part) && Number(part) >= 0 && Number(part) <= 255);
}

function isPrivateIPv4(value) {
  if (!isIPv4(value)) return false;
  const [a, b] = value.split('.').map(Number);
  return a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}

function isPrivateBaseIp(value) {
  if (typeof value !== 'string') return false;
  const candidate = `${value.trim()}.1`;
  return /^\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(value.trim()) && isPrivateIPv4(candidate);
}

function cleanName(value, fallback = 'Unbenannt') {
  const clean = String(value || '').replace(/[\r\n\t]/g, ' ').trim().slice(0, 60);
  return clean || fallback;
}

function normalizeStreamUrl(value) {
  const raw = String(value || '').trim().slice(0, 500);
  // Repariert den häufigen Touch-Tippfehler "hthttps://..." ohne andere URLs still zu verbiegen.
  if (/^hthttps:\/\//i.test(raw)) return raw.slice(2);
  if (/^hthttp:\/\//i.test(raw)) return raw.slice(2);
  return raw;
}

function sanitizeTasmotaList(value) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  return value.slice(0, 80).reduce((acc, item) => {
    const ip = String(item?.ip || '').trim();
    if (!isPrivateIPv4(ip) || seen.has(ip)) return acc;
    seen.add(ip);
    acc.push({ ip, name: cleanName(item?.name, `Tasmota (${ip})`) });
    return acc;
  }, []);
}

function sanitizeStations(value) {
  const stations = Array.isArray(value?.stations) ? value.stations : [];
  return {
    stations: stations.slice(0, 40).reduce((acc, station) => {
      const name = cleanName(station?.name, 'Sender');
      const url = normalizeStreamUrl(station?.url);
      if (!/^https?:\/\//i.test(url)) return acc;
      acc.push({ name, url });
      return acc;
    }, [])
  };
}

// Tasmota Backup Memory (RAM)
let tasmotaRAM = [];

function getTasmota() {
  if (fs.existsSync(TASMOTA_FILE)) {
    try {
      tasmotaRAM = sanitizeTasmotaList(JSON.parse(fs.readFileSync(TASMOTA_FILE, 'utf8')));
    } catch(e) { console.error("Parse Error Tasmota File", e); }
  }
  return tasmotaRAM;
}

function saveTasmota(data) {
  tasmotaRAM = sanitizeTasmotaList(data);
  try {
    fs.writeFileSync(TASMOTA_FILE, JSON.stringify(tasmotaRAM, null, 2));
  } catch(e) {
    console.error("Schreibfehler Tasmota File", e);
  }
}

getTasmota();

const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (req, file, cb) => cb(null, 'calendar.ics')
});
const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    const ok = file.originalname.toLowerCase().endsWith('.ics') || file.mimetype === 'text/calendar';
    cb(ok ? null : new Error('Nur .ics-Dateien sind erlaubt.'), ok);
  }
});

// ==== RADIO SETTINGS API ====
app.get('/api/radio', (req, res) => {
  if (fs.existsSync(RADIO_FILE)) {
    try {
      res.json(sanitizeStations(JSON.parse(fs.readFileSync(RADIO_FILE, 'utf8'))));
    } catch(e) {
      res.json({ stations: [] });
    }
  } else {
    res.json({ stations: [] });
  }
});

app.post('/api/radio', (req, res) => {
  try {
    const cleaned = sanitizeStations(req.body);
    fs.writeFileSync(RADIO_FILE, JSON.stringify(cleaned, null, 2));
    res.json({ success: true });
    io.emit('radio-updated', cleaned);
  } catch(e) {
    res.json({ success: false });
  }
});

app.post('/api/upload-ics', upload.single('icsFile'), (req, res) => {
  res.json({ success: true });
});
app.get('/api/ics-data', (req, res) => {
  const icsPath = path.join(UPLOAD_DIR, 'calendar.ics');
  if (fs.existsSync(icsPath)) {
    res.json({ success: true, data: fs.readFileSync(icsPath, 'utf-8') });
  } else {
    res.json({ success: false });
  }
});

// ==== TASMOTA API ====
app.get('/api/tasmota', (req, res) => {
  res.json(tasmotaRAM);
});

app.post('/api/tasmota', (req, res) => {
  console.log("Speichere Tasmota Data: ", req.body);
  saveTasmota(req.body);
  res.json({success: true, saved: tasmotaRAM});
});

app.get('/api/tasmota/status', async (req, res) => {
  const devices = tasmotaRAM;
  const results = await Promise.all(devices.map(async d => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 1200);
      const r = await fetch(`http://${d.ip}/cm?cmnd=Power`, { signal: controller.signal });
      clearTimeout(timeout);
      const j = await r.json();
      return { ip: d.ip, state: j.POWER || 'OFF', online: true };
    } catch(e) {
      return { ip: d.ip, state: 'OFF', online: false };
    }
  }));
  res.json(results);
});

app.get('/api/tasmota/sensor', async (req, res) => {
  const ip = String(req.query?.ip || '192.168.178.40').trim();
  if (!isPrivateIPv4(ip)) return res.status(400).json({success: false, error: 'Ungültige lokale IPv4-Adresse'});

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);
    const r = await fetch(`http://${ip}/cm?cmnd=Status%2010`, { signal: controller.signal });
    clearTimeout(timeout);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const data = await r.json();
    const sensors = data?.StatusSNS || {};
    const sensorName = Object.keys(sensors).find(key => sensors[key] && typeof sensors[key] === 'object' && 'Temperature' in sensors[key] && 'Humidity' in sensors[key]);
    const sensor = sensorName ? sensors[sensorName] : null;
    if (!sensor) return res.status(404).json({success: false, online: true, error: 'Kein Temperatur-/Feuchte-Sensor gefunden'});

    res.json({
      success: true,
      online: true,
      ip,
      name: sensorName,
      time: sensors.Time || null,
      temperature: Number(sensor.Temperature),
      humidity: Number(sensor.Humidity),
      dewPoint: Number(sensor.DewPoint),
      tempUnit: sensors.TempUnit || 'C'
    });
  } catch (e) {
    res.json({success: false, online: false, ip, error: e.message});
  }
});

app.post('/api/tasmota/toggle', async (req, res) => {
  const ip = String(req.body?.ip || '').trim();
  if (!isPrivateIPv4(ip)) return res.status(400).json({success: false, error: 'Ungültige lokale IPv4-Adresse'});
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const r = await fetch(`http://${ip}/cm?cmnd=Power%20TOGGLE`, { signal: controller.signal });
    clearTimeout(timeout);
    const j = await r.json();
    res.json({success: true, state: j.POWER});
  } catch (e) {
    console.error("Tasmota Toggle Error", e.message);
    res.json({success: false, error: e.message});
  }
});

// ====== NEUER, SAUBERER SCANNER =====
app.post('/api/tasmota/scan', async (req, res) => {
  const baseIp = String(req.body?.baseIp || '').trim(); 
  if(!isPrivateBaseIp(baseIp)) return res.status(400).json({success: false, found: [], error: 'Ungültiges privates Subnetz'});

  const found = [];
  console.log("Start Tasmota Scan in Subnet: " + baseIp + ".x");

  async function scanChunk(ips) {
    const promises = ips.map(ip => {
      return new Promise(async (resolve) => {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 2500); 
          const r = await fetch(`http://${ip}/cm?cmnd=Status`, { signal: controller.signal });
          clearTimeout(timeout);
          const data = await r.json();
          if (data && data.Status && data.Status.FriendlyName) {
            console.log("GEFUNDEN: " + ip);
            found.push({ip: ip, name: data.Status.FriendlyName[0] || `Tasmota (${ip})`});
          }
        } catch (err) {}
        resolve();
      });
    });
    await Promise.all(promises);
  }

  const allIps = [];
  for(let i=1; i<255; i++) { allIps.push(`${baseIp}.${i}`); }

  // Scanne im Array von 20 IP Adressen nacheinander um Verbindungsabriss zu vermeiden
  const chunkSize = 20;
  for (let i = 0; i < allIps.length; i += chunkSize) {
    const chunk = allIps.slice(i, i + chunkSize);
    await scanChunk(chunk);
  }

  console.log("Scan beendet. Tasmota gefunden: ", found.length);
  res.json({success: true, found});
});

// ==== FRITZ!BOX MONITOR LOGIC ====
const FRITZ_FILE = path.join(DATA_DIR, 'fritzbox.json');
const CALLS_LOG_FILE = path.join(DATA_DIR, 'fritzbox_calls.json');

let fritzConfig = { ip: '192.168.178.1', user: '', pass: '', callMonitorEnabled: true };
let fritzCalls = [];
let activeCalls = {};
let callMonitorSocket = null;
let reconnectTimeout = null;

function loadFritzConfig() {
  if (fs.existsSync(FRITZ_FILE)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(FRITZ_FILE, 'utf8'));
      fritzConfig = {
        ip: String(parsed.ip || '192.168.178.1').trim(),
        user: String(parsed.user || '').trim(),
        pass: String(parsed.pass || ''),
        callMonitorEnabled: parsed.callMonitorEnabled !== false
      };
    } catch (e) { console.error("Parse Error fritzbox.json", e); }
  }
  return fritzConfig;
}

function saveFritzConfig(cfg) {
  fritzConfig = {
    ip: String(cfg.ip || '192.168.178.1').trim(),
    user: String(cfg.user || '').trim(),
    pass: String(cfg.pass || ''),
    callMonitorEnabled: cfg.callMonitorEnabled !== false
  };
  try {
    fs.writeFileSync(FRITZ_FILE, JSON.stringify(fritzConfig, null, 2));
  } catch (e) { console.error("Schreibfehler fritzbox.json", e); }
}

function loadCallLog() {
  if (fs.existsSync(CALLS_LOG_FILE)) {
    try {
      fritzCalls = JSON.parse(fs.readFileSync(CALLS_LOG_FILE, 'utf8'));
    } catch (e) { console.error("Parse Error fritzbox_calls.json", e); }
  }
}

function saveCallLog() {
  try {
    fs.writeFileSync(CALLS_LOG_FILE, JSON.stringify(fritzCalls, null, 2));
  } catch (e) { console.error("Schreibfehler fritzbox_calls.json", e); }
}

function addOrUpdateCall(id, data) {
  activeCalls[id] = data;
  io.emit('fritz-calls', getMergedCalls());
}

function addCallToLog(call) {
  fritzCalls.unshift({
    type: call.type === 'CONNECTED' ? 'RING' : call.type,
    number: call.number,
    time: call.time,
    duration: call.duration,
    callerName: call.callerName || 'Unbekannter Anrufer'
  });
  fritzCalls = fritzCalls.slice(0, 10);
  saveCallLog();
  io.emit('fritz-calls', fritzCalls);
}

function getMergedCalls() {
  const current = Object.values(activeCalls).map(c => ({
    type: c.type,
    number: c.number,
    time: c.time,
    duration: 0,
    callerName: c.type === 'RING' ? 'Klingelt...' : 'Verbunden'
  }));
  return [...current, ...fritzCalls].slice(0, 10);
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
    socket.on('error', () => done(true));
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

  if (!fritzConfig.callMonitorEnabled || !fritzConfig.ip) {
    console.log('[Fritz!Box] CallMonitor ist deaktiviert.');
    return;
  }

  console.log(`[Fritz!Box] Verbinde mit CallMonitor auf ${fritzConfig.ip}:1012...`);
  callMonitorSocket = net.createConnection({ host: fritzConfig.ip, port: 1012 });

  callMonitorSocket.on('connect', () => {
    console.log('[Fritz!Box] Live-CallMonitor erfolgreich verbunden!');
    io.emit('fritz-calls', getMergedCalls());
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
        
        io.emit('fritz-ringing', {
          active: true,
          number: callerNumber,
          callerName: 'Eingehender Anruf'
        });

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
        io.emit('fritz-ringing', { active: false });

        const call = activeCalls[connectionId];
        if (call) {
          call.type = 'CONNECTED';
          call.connectTime = Date.now();
          io.emit('fritz-calls', getMergedCalls());
        }
      }
      else if (type === 'DISCONNECT') {
        const duration = Number(parts[3] || 0);
        console.log(`[Fritz!Box] DISCONNECT - Gespräch beendet bei ID ${connectionId}, Dauer ${duration}s`);
        io.emit('fritz-ringing', { active: false });

        const call = activeCalls[connectionId];
        if (call) {
          call.active = false;
          call.duration = duration;
          
          if (duration === 0 && call.type === 'RING') {
            call.type = 'MISSED';
          }
          
          addCallToLog(call);
          delete activeCalls[connectionId];
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

function initFritzboxConnections() {
  loadFritzConfig();
  connectFritzCallMonitor();
}

// Initialisiere die Fritz!Box-Dienste beim Server-Start
loadCallLog();
initFritzboxConnections();

// API Endpunkte für Fritz!Box
app.get('/api/fritzbox/config', (req, res) => {
  res.json({
    success: true,
    ip: fritzConfig.ip,
    user: fritzConfig.user,
    callMonitorEnabled: fritzConfig.callMonitorEnabled
  });
});

app.post('/api/fritzbox/config', (req, res) => {
  try {
    saveFritzConfig(req.body);
    initFritzboxConnections();
    res.json({ success: true });
  } catch(e) {
    res.json({ success: false, error: e.message });
  }
});

app.get('/api/fritzbox/radio', async (req, res) => {
  if (!fritzConfig.ip) {
    return res.json({ success: false, error: 'Keine Fritz!Box IP konfiguriert' });
  }

  try {
    const service = 'urn:schemas-upnp-org:service:ContentDirectory:1';
    const action = 'Browse';
    const soapPath = '/MediaServer/ContentDirectory/Control';
    
    // Schritt 1: Browse Internetradio Ordner (holt alle Sender-Ordner)
    const folderRes = await soapCall(fritzConfig.ip, soapPath, service, action, {
      ObjectID: '4:cont2:150:0:0:',
      BrowseFlag: 'BrowseDirectChildren',
      Filter: '*',
      StartingIndex: 0,
      RequestedCount: 100,
      SortCriteria: ''
    });

    if (folderRes.status !== 200 || !folderRes.body) {
      return res.json({ success: true, stations: [] });
    }

    const match = folderRes.body.match(/<Result>([\s\S]+?)<\/Result>/);
    if (!match) {
      return res.json({ success: true, stations: [] });
    }

    const xml = match[1]
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"');

    const stationFolders = [];
    const containerRegex = /<container\s+id="([^"]+)"[^>]*>([\s\S]+?)<\/container>/g;
    let m;
    while ((m = containerRegex.exec(xml)) !== null) {
      const id = m[1];
      const inner = m[2];
      const titleM = inner.match(/<dc:title>([^<]+)<\/dc:title>/);
      const title = titleM ? titleM[1] : 'Unbekannter Sender';
      stationFolders.push({ id, name: title });
    }

    // Schritt 2: Jeden Sender-Ordner abfragen, um den tatsächlichen Stream-Track auszulesen
    const stations = [];
    for (const folder of stationFolders) {
      const itemRes = await soapCall(fritzConfig.ip, soapPath, service, action, {
        ObjectID: folder.id,
        BrowseFlag: 'BrowseDirectChildren',
        Filter: '*',
        StartingIndex: 0,
        RequestedCount: 100,
        SortCriteria: ''
      });

      if (itemRes.status === 200 && itemRes.body) {
        const fMatch = itemRes.body.match(/<Result>([\s\S]+?)<\/Result>/);
        if (fMatch) {
          const fXml = fMatch[1]
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"');

          const itemRegex = /<item\s+id="([^"]+)"[^>]*>([\s\S]+?)<\/item>/;
          const itemMatch = fXml.match(itemRegex);
          if (itemMatch) {
            const itemInner = itemMatch[0];
            const resMatch = itemInner.match(/<res[^>]*>([^<]+)<\/res>/);
            const url = resMatch ? resMatch[1] : '';
            if (url) {
              stations.push({ name: folder.name, url: url });
            }
          }
        }
      }
    }

    res.json({ success: true, stations });
  } catch (e) {
    console.error('[Fritzbox Radio] Fehler beim Laden:', e);
    res.json({ success: false, error: e.message });
  }
});

// ==== FRITZ!BOX TR-064 SOAP CLIENT & PRESENCE DETECTION ====
const PRESENCE_FILE = path.join(DATA_DIR, 'presence.json');
let presenceRAM = [];
let isPresencePolling = false;

function loadPresence() {
  if (fs.existsSync(PRESENCE_FILE)) {
    try {
      presenceRAM = JSON.parse(fs.readFileSync(PRESENCE_FILE, 'utf8'));
    } catch (e) {
      console.error("[Presence] Parse Error presence.json", e);
      presenceRAM = [];
    }
  } else {
    presenceRAM = [];
  }
  return presenceRAM;
}

function savePresence() {
  try {
    fs.writeFileSync(PRESENCE_FILE, JSON.stringify(presenceRAM, null, 2));
  } catch (e) {
    console.error("[Presence] Schreibfehler presence.json", e);
  }
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

async function queryFritzPresence(mac) {
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
      savePresence();
      io.emit('presence-updated', presenceRAM);
    }
  } catch (e) {
    console.error('[Presence] Polling Fehler:', e.message);
  } finally {
    isPresencePolling = false;
  }
}

// REST Endpunkte für Anwesenheitserkennung
app.get('/api/presence', (req, res) => {
  res.json(presenceRAM);
});

const avatarStorage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `avatar_${Date.now()}${ext}`);
  }
});
const avatarUpload = multer({
  storage: avatarStorage,
  limits: { fileSize: 3 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    const ok = /\.(jpg|jpeg|png|webp)$/i.test(file.originalname);
    cb(ok ? null : new Error('Nur Bilddateien (JPG, PNG, WEBP) sind erlaubt.'), ok);
  }
});

app.post('/api/presence/upload', avatarUpload.single('avatarFile'), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, error: 'Keine Datei hochgeladen.' });
  res.json({ success: true, url: `/uploads/${req.file.filename}` });
});

app.post('/api/presence', (req, res) => {
  try {
    const { id, name, mac, image } = req.body;
    const cleanId = String(id || Date.now());
    const cleanN = cleanName(name, 'Person');
    const cleanM = String(mac || '').trim().toUpperCase();

    if (!/^([0-9A-F]{2}[:-]){5}([0-9A-F]{2})$/i.test(cleanM)) {
      return res.status(400).json({ success: false, error: 'Ungültiges MAC-Adressen-Format.' });
    }

    const index = presenceRAM.findIndex(p => p.id === cleanId);
    const existing = index >= 0 ? presenceRAM[index] : null;

    const person = {
      id: cleanId,
      name: cleanN,
      mac: cleanM,
      image: image || (existing ? existing.image : ''),
      active: existing ? existing.active : false,
      lastSeen: existing ? existing.lastSeen : '---'
    };

    if (index >= 0) {
      presenceRAM[index] = person;
    } else {
      presenceRAM.push(person);
    }

    savePresence();
    res.json({ success: true, person });
    io.emit('presence-list-updated', presenceRAM);
    
    // Trigger dynamic state update immediately
    pollPresence();
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.delete('/api/presence/:id', (req, res) => {
  try {
    const id = String(req.params.id);
    const index = presenceRAM.findIndex(p => p.id === id);
    if (index >= 0) {
      const person = presenceRAM[index];
      if (person.image && person.image.startsWith('/uploads/avatar_')) {
        const filePath = path.join(__dirname, person.image);
        if (fs.existsSync(filePath)) {
          try { fs.unlinkSync(filePath); } catch (err) {}
        }
      }
      presenceRAM.splice(index, 1);
      savePresence();
      res.json({ success: true });
      io.emit('presence-list-updated', presenceRAM);
    } else {
      res.status(404).json({ success: false, error: 'Person nicht gefunden.' });
    }
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Initialisiere Presence
loadPresence();
setInterval(pollPresence, 30000);
setTimeout(pollPresence, 5000);

// ==== KAMERA MONITOR LOGIC & API ====
let camerasRAM = [];

function sanitizeCameras(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 10).reduce((acc, cam) => {
    const id = String(cam?.id || Date.now() + Math.random().toString(36).substring(2, 7));
    const name = cleanName(cam?.name, 'Kamera');
    const url = String(cam?.url || '').trim().slice(0, 800);
    if (!/^https?:\/\//i.test(url)) return acc;
    const interval = Math.max(0, Number(cam?.interval || 0));
    acc.push({ id, name, url, interval });
    return acc;
  }, []);
}

function loadCameras() {
  if (fs.existsSync(CAMERAS_FILE)) {
    try {
      camerasRAM = sanitizeCameras(JSON.parse(fs.readFileSync(CAMERAS_FILE, 'utf8')));
    } catch(e) { console.error("[Cameras] Parse Error", e); }
  }
  return camerasRAM;
}

function saveCameras(data) {
  camerasRAM = sanitizeCameras(data);
  try {
    fs.writeFileSync(CAMERAS_FILE, JSON.stringify(camerasRAM, null, 2));
  } catch(e) { console.error("[Cameras] Schreibfehler", e); }
}

// Initialisiere Kameras
loadCameras();

app.get('/api/cameras', (req, res) => {
  res.json(camerasRAM);
});

app.post('/api/cameras', (req, res) => {
  try {
    const { id, name, url, interval } = req.body;
    const cleanId = String(id || Date.now());
    const cleanN = cleanName(name, 'Kamera');
    const cleanU = String(url || '').trim().slice(0, 800);
    if (!/^https?:\/\//i.test(cleanU)) {
      return res.status(400).json({ success: false, error: 'Ungültige Kamera-URL. Muss mit http:// oder https:// beginnen.' });
    }
    const cleanI = Math.max(0, Number(interval || 0));

    const index = camerasRAM.findIndex(c => c.id === cleanId);
    const existing = index >= 0 ? camerasRAM[index] : null;

    const camera = {
      id: cleanId,
      name: cleanN,
      url: cleanU,
      interval: cleanI
    };

    if (index >= 0) {
      camerasRAM[index] = camera;
    } else {
      camerasRAM.push(camera);
    }

    saveCameras(camerasRAM);
    res.json({ success: true, camera });
    io.emit('cameras-updated', camerasRAM);
  } catch(e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.delete('/api/cameras/:id', (req, res) => {
  try {
    const id = String(req.params.id);
    const index = camerasRAM.findIndex(c => c.id === id);
    if (index >= 0) {
      camerasRAM.splice(index, 1);
      saveCameras(camerasRAM);
      res.json({ success: true });
      io.emit('cameras-updated', camerasRAM);
    } else {
      res.status(404).json({ success: false, error: 'Kamera nicht gefunden.' });
    }
  } catch(e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Netzwerk Status-Schleife (alle 10s)

setInterval(async () => {
  if (!fritzConfig.ip) return;
  try {
    const fritzPing = await pingTcp(fritzConfig.ip, 80, 1000);
    const internetPing = await pingTcp('1.1.1.1', 53, 1000);
    io.emit('fritz-status', {
      fritzOnline: fritzPing.online,
      fritzLatency: fritzPing.latency,
      internetOnline: internetPing.online,
      internetLatency: internetPing.latency
    });
  } catch(e) {}
}, 10000);

// ==== SOCKETS & SYSTEM ====
io.on('connection', (socket) => {
  socket.on('update-layout', (layout) => socket.broadcast.emit('layout-updated', layout));
  socket.emit('fritz-calls', getMergedCalls());
  socket.emit('presence-list-updated', presenceRAM);
  socket.emit('cameras-updated', camerasRAM);
});

setInterval(async () => {
  try {
    const cpuLoad = await si.currentLoad();
    const mem = await si.mem();
    const temp = await si.cpuTemperature();
    const net = await si.networkStats(); 
    let tx_sec = 0; let rx_sec = 0;
    if (net && net.length > 0) {
      net.forEach(iface => { rx_sec += iface.rx_sec; tx_sec += iface.tx_sec; });
    }
    const totalNetMb = (tx_sec + rx_sec) / (1024 * 1024);
    io.emit('sys-status', {
      cpu: cpuLoad.currentLoad,                   
      ram: (mem.active / mem.total) * 100,        
      temp: temp.main || 40,                      
      net: totalNetMb                             
    });
  } catch (e) {}
}, 2000);

server.listen(PORT, HOST, () => {
  const protocol = useSSL ? 'https' : 'http';
  console.log(`Server läuft auf ${protocol}://${HOST}:${PORT}`);
});
