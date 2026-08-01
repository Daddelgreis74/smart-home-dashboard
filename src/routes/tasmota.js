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
const fs = require('fs');
const path = require('path');

const { DATA_DIR } = require('../config/env');

const router = express.Router();

// Lade Push-Cache für Deep-Sleep Sensoren von Festplatte
const PUSH_CACHE_FILE = path.join(DATA_DIR, 'pushed-sensors.json');
let pushedSensorCache = {};
if (fs.existsSync(PUSH_CACHE_FILE)) {
  try {
    pushedSensorCache = JSON.parse(fs.readFileSync(PUSH_CACHE_FILE, 'utf8'));
  } catch (e) {
    console.error('[Tasmota Push] Fehler beim Laden des Push-Caches:', e.message);
  }
}

function savePushCache() {
  try {
    fs.writeFileSync(PUSH_CACHE_FILE, JSON.stringify(pushedSensorCache, null, 2), 'utf8');
  } catch (e) {
    console.error('[Tasmota Push] Fehler beim Speichern des Push-Caches:', e.message);
  }
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

// Neuer Endpoint für den Push-Empfang vom solarbetriebenen ESP32-C3
router.post('/sensor-push', (req, res) => {
  const ip = req.ip.replace(/^::ffff:/, ''); // IPv4 extrahieren falls dual-stack
  const data = req.body || {};
  
  console.log(`[Tasmota Push] Empfangen von ${ip}:`, data);
  
  const tzoffset = (new Date()).getTimezoneOffset() * 60000;
  const localISOTime = (new Date(Date.now() - tzoffset)).toISOString().slice(0, -1);

  const temperature = (typeof data.temperature === 'number' && !isNaN(data.temperature)) ? data.temperature : undefined;
  const humidity = (typeof data.humidity === 'number' && !isNaN(data.humidity)) ? data.humidity : undefined;
  const dewPoint = (typeof data.dewPoint === 'number' && !isNaN(data.dewPoint)) ? data.dewPoint : undefined;
  const batteryVoltage = (typeof data.batteryVoltage === 'number' && !isNaN(data.batteryVoltage)) ? data.batteryVoltage : undefined;
  const batteryPercent = (typeof data.batteryPercent === 'number' && !isNaN(data.batteryPercent)) ? data.batteryPercent : undefined;

  pushedSensorCache[ip] = {
    temperature,
    humidity,
    dewPoint,
    batteryVoltage,
    batteryPercent,
    time: localISOTime
  };
  
  savePushCache();
  
  // Realtime Broadcast an Web-HUD (falls Sockets aktiv)
  const io = req.app.get('io');
  if (io) {
    io.emit('sensor-update', { ip, data: pushedSensorCache[ip] });
  }
  
  res.json({ success: true, tempOffset: 0.0 });
});

router.get('/status', async (req, res) => {
  const devices = fileStore.tasmotaRAM;
  const results = await getDeviceStatus(devices);
  res.json(results);
});

router.get('/sensor', async (req, res) => {
  const ip = String(req.query?.ip || '192.168.178.40').trim();
  if (!isPrivateIPv4(ip)) return res.status(400).json({ success: false, error: 'Ungültige lokale IPv4-Adresse' });

  // Falls wir gespeicherte Push-Daten für diesen Sensor besitzen, liefere diese direkt aus dem Cache
  if (pushedSensorCache[ip]) {
    const cached = pushedSensorCache[ip];
    return res.json({
      success: true,
      online: true,
      ip,
      name: 'Solar-Sensor',
      time: cached.time,
      temperature: cached.temperature,
      humidity: cached.humidity,
      dewPoint: cached.dewPoint,
      tempUnit: 'C',
      batteryPercent: cached.batteryPercent,
      batteryVoltage: cached.batteryVoltage
    });
  }

  try {
    const data = await getSensorData(ip);
    res.json(data);
  } catch (e) {
    res.json({ success: false, online: false, ip, error: e.message });
  }
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
