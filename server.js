const express = require('express');
const https = require('https');
const { Server } = require('socket.io');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const si = require('systeminformation');
const { execFile } = require('child_process');

const app = express();
const PORT = Number(process.env.PORT || 8443);
const HOST = process.env.HOST || '0.0.0.0';
const TASMOTA_FILE = path.join(__dirname, 'tasmota.json');
const RADIO_FILE = path.join(__dirname, 'radio.json');
const UPLOAD_DIR = path.join(__dirname, 'uploads');
const SSL_DIR = path.join(__dirname, 'ssl');
const VOICE_TALK_ENABLED = process.env.OPENCLAW_VOICE_TALK === '1';
const VOICE_TALK_SESSION = process.env.OPENCLAW_VOICE_SESSION || 'smart-home-dashboard-voice';
const VOICE_TALK_TIMEOUT_MS = Math.max(10_000, Number(process.env.OPENCLAW_VOICE_TIMEOUT_MS || 120_000));
const OPENCLAW_CLI = (process.env.OPENCLAW_CLI && process.env.OPENCLAW_CLI !== '1')
  ? process.env.OPENCLAW_CLI
  : '/root/.npm-global/bin/openclaw';
const FULLY_TTS_URL = String(process.env.FULLY_TTS_URL || '').replace(/\/+$/, '');
const FULLY_TTS_PASSWORD = process.env.FULLY_TTS_PASSWORD || '';
const FULLY_TTS_ENABLED = /^https?:\/\//i.test(FULLY_TTS_URL) && FULLY_TTS_PASSWORD.length > 0;

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

function extractAgentReply(stdout) {
  const text = String(stdout || '').trim();
  if (!text) return '';
  try {
    const parsed = JSON.parse(text);
    const payloadText = Array.isArray(parsed?.payloads)
      ? parsed.payloads.map(p => p?.text).filter(Boolean).join('\n\n').trim()
      : '';
    return payloadText || parsed?.meta?.finalAssistantVisibleText || parsed?.meta?.finalAssistantRawText || '';
  } catch (e) {
    const firstJson = text.indexOf('{');
    const lastJson = text.lastIndexOf('}');
    if (firstJson >= 0 && lastJson > firstJson) {
      try {
        const parsed = JSON.parse(text.slice(firstJson, lastJson + 1));
        return parsed?.payloads?.[0]?.text || parsed?.meta?.finalAssistantVisibleText || '';
      } catch (_) {}
    }
    return text;
  }
}

function askOpenClaw(message) {
  const prompt = [
    'Du bist Neo im Smart-Home-Dashboard auf Steffens Tablet.',
    'Antworte kurz, natürlich und gut vorlesbar auf Deutsch.',
    'Die Antwort wird per Text-to-Speech vorgelesen, also keine Markdown-Tabellen und keine langen Listen.',
    'Wenn der Nutzer eine externe, destruktive oder private Aktion verlangt, sag kurz, dass du dafür erst Bestätigung im normalen Chat brauchst.',
    '',
    `Gesprochene Eingabe: ${message}`
  ].join('\n');

  return new Promise((resolve, reject) => {
    execFile(OPENCLAW_CLI, [
      'agent',
      '--session-id', VOICE_TALK_SESSION,
      '--message', prompt,
      '--json',
      '--timeout', String(Math.ceil(VOICE_TALK_TIMEOUT_MS / 1000))
    ], {
      cwd: __dirname,
      timeout: VOICE_TALK_TIMEOUT_MS + 5_000,
      maxBuffer: 1024 * 1024 * 4,
      env: process.env
    }, (error, stdout, stderr) => {
      if (error) {
        const details = String(stderr || error.message || 'OpenClaw Anfrage fehlgeschlagen').slice(0, 600);
        reject(new Error(details));
        return;
      }
      const reply = extractAgentReply(stdout).trim();
      resolve(reply || 'Ich habe keine Antwort bekommen.');
    });
  });
}

async function speakWithFully(text) {
  if (!FULLY_TTS_ENABLED || !text) return { mode: 'browser', ok: false, skipped: true };
  const params = new URLSearchParams({
    cmd: 'textToSpeech',
    type: 'json',
    password: FULLY_TTS_PASSWORD,
    text: String(text).slice(0, 1200),
    queue: '0'
  });
  const response = await fetch(`${FULLY_TTS_URL}/?${params.toString()}`, {
    signal: AbortSignal.timeout(10_000)
  });
  if (!response.ok) throw new Error(`Fully TTS HTTP ${response.status}`);
  const data = await response.json().catch(() => ({}));
  if (data.status && data.status !== 'OK') throw new Error(data.statustext || 'Fully TTS fehlgeschlagen');
  return { mode: 'fully', ok: true };
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

// ==== NEO VOICE TALK ====
app.get('/api/talk-config', (req, res) => {
  res.json({
    enabled: VOICE_TALK_ENABLED,
    session: VOICE_TALK_SESSION,
    ttsMode: FULLY_TTS_ENABLED ? 'fully' : 'browser'
  });
});

app.post('/api/neo-talk/speak', async (req, res) => {
  if (!VOICE_TALK_ENABLED) {
    return res.status(403).json({ success: false, error: 'Neo Talk ist serverseitig nicht aktiviert.' });
  }
  const text = String(req.body?.text || '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, 1200);
  if (!text) return res.status(400).json({ success: false, error: 'Kein Text zum Vorlesen.' });
  try {
    const tts = await speakWithFully(text);
    if (tts.mode !== 'fully') return res.status(400).json({ success: false, error: 'Fully TTS ist nicht konfiguriert.' });
    res.json({ success: true, tts });
  } catch (e) {
    console.error('Fully TTS Error:', e.message);
    res.status(500).json({ success: false, error: 'Fully konnte den Text gerade nicht vorlesen.' });
  }
});

app.post('/api/neo-talk', async (req, res) => {
  if (!VOICE_TALK_ENABLED) {
    return res.status(403).json({ success: false, error: 'Neo Talk ist serverseitig nicht aktiviert.' });
  }
  const text = String(req.body?.text || '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, 800);
  if (!text) return res.status(400).json({ success: false, error: 'Keine Spracheingabe erkannt.' });
  try {
    const reply = await askOpenClaw(text);
    let tts = { mode: FULLY_TTS_ENABLED ? 'fully' : 'browser', ok: false, skipped: true };
    if (FULLY_TTS_ENABLED && req.body?.speak !== false) {
      try {
        tts = await speakWithFully(reply);
      } catch (e) {
        console.error('Fully TTS Error:', e.message);
        tts = { mode: 'fully', ok: false, error: 'Fully konnte den Text gerade nicht vorlesen.' };
      }
    }
    res.json({ success: true, text, reply, tts });
  } catch (e) {
    console.error('Neo Talk Error:', e.message);
    res.status(500).json({ success: false, error: 'Neo konnte gerade nicht antworten.' });
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
