const express = require('express');
const fileStore = require('../utils/fileStore');
const { isPrivateIPv4, isPrivateBaseIp, validateTasmotaStructure } = require('../utils/validation');
const { 
  getDeviceStatus, 
  getSensorData, 
  toggleDevice, 
  setDevicePower, 
  scanSubnet 
} = require('../services/tasmotaService');

const router = express.Router();

// RAM-Cache für Batterie-betriebene Push-Sensoren
const sensorCache = {};

function calculateDewPoint(temp, hum) {
  const a = 17.625;
  const b = 243.04;
  const alpha = ((a * temp) / (b + temp)) + Math.log(hum / 100.0);
  return (b * alpha) / (a - alpha);
}

router.get('/', (req, res) => {
  res.json(fileStore.tasmotaRAM);
});

router.post('/', (req, res) => {
  if (!validateTasmotaStructure(req.body)) {
    return res.status(400).json({ success: false, error: 'Ungültiges Tasmota-Geräteformat' });
  }
  console.log("Speichere Tasmota Data: ", req.body);
  fileStore.saveTasmota(req.body);
  res.json({ success: true, saved: fileStore.tasmotaRAM });
});

router.get('/status', async (req, res) => {
  const devices = fileStore.tasmotaRAM;
  // Falls Geräte im Cache sind, setzen wir deren Zustand auf ONLINE (da sie schlafen)
  const results = await getDeviceStatus(devices);
  const updatedResults = results.map(r => {
    if (sensorCache[r.ip]) {
      return { ip: r.ip, state: 'ON', online: true };
    }
    return r;
  });
  res.json(updatedResults);
});

router.get('/sensor', async (req, res) => {
  const ip = String(req.query?.ip || '192.168.178.40').trim();
  if (!isPrivateIPv4(ip)) return res.status(400).json({ success: false, error: 'Ungültige lokale IPv4-Adresse' });

  // Falls Push-Daten für diese IP vorliegen, liefere diese direkt aus dem Cache aus
  if (sensorCache[ip]) {
    return res.json(sensorCache[ip]);
  }

  try {
    const data = await getSensorData(ip);
    res.json(data);
  } catch (e) {
    res.json({ success: false, online: false, ip, error: e.message });
  }
});

// Neuer Push-Endpoint für schlafende Sensoren
router.post('/sensor-push', (req, res) => {
  // IP des Absenders ermitteln (Proxy-aware)
  const rawIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  let ip = rawIp;
  if (ip.includes('::ffff:')) {
    ip = ip.split('::ffff:')[1];
  }
  ip = ip.trim();

  const { temperature, humidity, dewPoint } = req.body;
  if (temperature === undefined || humidity === undefined) {
    return res.status(400).json({ success: false, error: 'temperature und humidity fehlen' });
  }

  const tempNum = Number(temperature);
  const humNum = Number(humidity);
  const dpNum = dewPoint !== undefined ? Number(dewPoint) : Number(calculateDewPoint(tempNum, humNum));

  console.log(`[Sensor Push] Empfangen von ${ip}: ${tempNum} °C, ${humNum} %, DP: ${dpNum} °C`);

  sensorCache[ip] = {
    success: true,
    online: true,
    ip,
    name: "DHT22 (Garten)",
    time: new Date().toISOString(),
    temperature: tempNum,
    humidity: humNum,
    dewPoint: dpNum,
    tempUnit: 'C'
  };

  // Optional: Sende Socket-Update an verbundene Clients zur Echtzeitanzeige
  const io = req.app.get('io');
  if (io) {
    io.emit('tasmota_update', sensorCache[ip]);
  }

  // Erfolgsantwort zurücksenden.
  // Optional kann hier ein verändertes "tempOffset" übergeben werden, falls gewünscht.
  res.json({ success: true });
});


router.post('/toggle', async (req, res) => {
  const ip = String(req.body?.ip || '').trim();
  if (!isPrivateIPv4(ip)) return res.status(400).json({ success: false, error: 'Ungültige lokale IPv4-Adresse' });
  try {
    const state = await toggleDevice(ip);
    res.json({ success: true, state });
  } catch (e) {
    console.error("Tasmota Toggle Error", e.message);
    res.json({ success: false, error: e.message });
  }
});

router.post('/power', async (req, res) => {
  const ip = String(req.body?.ip || '').trim();
  const action = String(req.body?.action || 'TOGGLE').trim().toUpperCase();
  if (!isPrivateIPv4(ip)) return res.status(400).json({ success: false, error: 'Ungültige lokale IPv4-Adresse' });
  try {
    const state = await setDevicePower(ip, action);
    res.json({ success: true, state });
  } catch (e) {
    console.error("Tasmota Power Error", e.message);
    res.json({ success: false, error: e.message });
  }
});

router.post('/scan', async (req, res) => {
  const baseIp = String(req.body?.baseIp || '').trim(); 
  if (!isPrivateBaseIp(baseIp)) return res.status(400).json({ success: false, found: [], error: 'Ungültiges privates Subnetz' });

  try {
    const found = await scanSubnet(baseIp);
    res.json({ success: true, found });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;
