const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const si = require('systeminformation');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = 8443;
const TASMOTA_FILE = path.join(__dirname, 'tasmota.json');

app.use(express.static('public'));
app.use(express.json());

// Tasmota Backup Memory (RAM)
let tasmotaRAM = [];

function getTasmota() {
  if (fs.existsSync(TASMOTA_FILE)) {
    try {
      tasmotaRAM = JSON.parse(fs.readFileSync(TASMOTA_FILE, 'utf8'));
    } catch(e) { console.error("Parse Error Tasmota File", e); }
  }
  return tasmotaRAM;
}

function saveTasmota(data) {
  tasmotaRAM = data;
  try {
    fs.writeFileSync(TASMOTA_FILE, JSON.stringify(data));
  } catch(e) {
    console.error("Schreibfehler Tasmota File", e);
  }
}

getTasmota();

const storage = multer.diskStorage({
  destination: './uploads/',
  filename: (req, file, cb) => cb(null, 'calendar.ics')
});
const upload = multer({ storage });

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
  const { ip } = req.body;
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
  const { baseIp } = req.body; 
  if(!baseIp) return res.json({success: false, found: []});

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

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server läuft auf Port ${PORT}`);
});
