const express = require('express');
const https = require('https');
const { Server } = require('socket.io');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const si = require('systeminformation');

const app = express();
const PORT = Number(process.env.PORT || 8443);
const HOST = process.env.HOST || '0.0.0.0';
const TASMOTA_FILE = path.join(__dirname, 'tasmota.json');
const RADIO_FILE = path.join(__dirname, 'radio.json');
const UPLOAD_DIR = path.join(__dirname, 'uploads');
const SSL_DIR = path.join(__dirname, 'ssl');

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const sslOptions = {
  key: fs.readFileSync(path.join(SSL_DIR, 'key.pem')),
  cert: fs.readFileSync(path.join(SSL_DIR, 'cert.pem'))
};

const server = https.createServer(sslOptions, app);
const io = new Server(server);

app.use(express.static('public'));
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
  const icsPath = path.join(__dirname, 'uploads', 'calendar.ics');
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
          const timeout = setTimeout(() => controller.abort(), 1000); 
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

// ==== SOCKETS & SYSTEM ====
io.on('connection', (socket) => {
  socket.on('update-layout', (layout) => socket.broadcast.emit('layout-updated', layout));
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
  console.log(`Server läuft auf https://${HOST}:${PORT}`);
});
