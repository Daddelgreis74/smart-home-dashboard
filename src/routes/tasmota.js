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

// Bereinige versehentlich gecachte IP-Adressen (z.B. Tasmota-Innensensoren), die als solar_outdoor gespeichert wurden
if (pushedSensorCache && typeof pushedSensorCache === 'object') {
  let cacheModified = false;
  Object.keys(pushedSensorCache).forEach(key => {
    if (isPrivateIPv4(key) && (pushedSensorCache[key]?.sensor === 'solar_outdoor' || pushedSensorCache[key]?.name === 'solar_outdoor')) {
      delete pushedSensorCache[key];
      cacheModified = true;
    }
  });
  if (cacheModified) {
    try {
      fs.writeFileSync(PUSH_CACHE_FILE, JSON.stringify(pushedSensorCache, null, 2), 'utf8');
    } catch (_) {}
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

function updatePushedSensor(ip, data) {
  const nowIso = data?.receivedAt || data?.time || new Date().toISOString();

  const temperature = (typeof data?.temperature === 'number' && !isNaN(data.temperature)) ? data.temperature : undefined;
  const humidity = (typeof data?.humidity === 'number' && !isNaN(data.humidity)) ? data.humidity : undefined;
  const dewPoint = (typeof data?.dewPoint === 'number' && !isNaN(data.dewPoint)) ? data.dewPoint : undefined;
  const batteryVoltage = (typeof data?.batteryVoltage === 'number' && !isNaN(data.batteryVoltage)) ? data.batteryVoltage : undefined;
  const batteryPercent = (typeof data?.batteryPercent === 'number' && !isNaN(data.batteryPercent)) ? data.batteryPercent : undefined;

  const entry = {
    sensor: data?.sensor,
    temperature,
    humidity,
    dewPoint,
    batteryVoltage,
    batteryPercent,
    time: nowIso
  };

  if (ip) {
    pushedSensorCache[ip] = entry;
  }
  if (data?.sensor) {
    pushedSensorCache[data.sensor] = entry;
  }

  // Generische Schlüssel für solarbetriebene Außensensoren (UDP)
  const sensorName = String(data?.sensor || '').toLowerCase();
  if (sensorName.includes('outdoor') || sensorName.includes('solar')) {
    pushedSensorCache['solar_outdoor'] = entry;
    pushedSensorCache['outdoor'] = entry;
    pushedSensorCache['udp'] = entry;
  }

  savePushCache();
  return entry;
}

// Neuer Endpoint für den Push-Empfang vom solarbetriebenen ESP32-C3
router.post('/sensor-push', (req, res) => {
  const ip = req.ip.replace(/^::ffff:/, ''); // IPv4 extrahieren falls dual-stack
  const data = req.body || {};
  
  console.log(`[Tasmota Push] Empfangen von ${ip}:`, data);
  const entry = updatePushedSensor(ip, data);
  
  // Realtime Broadcast an Web-HUD (falls Sockets aktiv)
  const io = req.app.get('io');
  if (io) {
    io.emit('sensor-update', { ip, data: entry });
    io.emit('sensor_update', { ip, ...entry });
  }
  
  res.json({ success: true, tempOffset: 0.0 });
});

router.updatePushedSensor = updatePushedSensor;

router.get('/status', async (req, res) => {
  const devices = fileStore.tasmotaRAM;
  const results = await getDeviceStatus(devices);
  res.json(results);
});

router.get('/sensor', async (req, res) => {
  const rawIp = String(req.query?.ip || '192.168.178.40').trim();
  const lowerIp = rawIp.toLowerCase();
  const isSpecialKey = ['solar_outdoor', 'outdoor', 'udp', 'broadcast'].includes(lowerIp);

  if (!isPrivateIPv4(rawIp) && !isSpecialKey) {
    return res.status(400).json({ success: false, error: 'Ungültige lokale IPv4-Adresse' });
  }

  // 1. Wenn Spezialschlüssel (udp, outdoor, solar_outdoor) angefragt wird:
  if (isSpecialKey) {
    const cached = pushedSensorCache['solar_outdoor'] || pushedSensorCache['outdoor'] || pushedSensorCache['udp'] || pushedSensorCache[lowerIp];
    if (cached) {
      let timeStr = cached.time;
      if (timeStr && typeof timeStr === 'string' && !timeStr.endsWith('Z') && !timeStr.includes('+')) {
        timeStr = timeStr + 'Z';
      }
      return res.json({
        success: true,
        online: true,
        ip: rawIp,
        name: cached.sensor || 'Solar-Sensor',
        time: timeStr,
        temperature: cached.temperature,
        humidity: cached.humidity,
        dewPoint: cached.dewPoint,
        tempUnit: 'C',
        batteryPercent: cached.batteryPercent,
        batteryVoltage: cached.batteryVoltage
      });
    }
    return res.json({ success: false, online: false, ip: rawIp, error: 'Keine UDP-Messdaten im Cache vorhanden' });
  }

  // 2. Prüfen, ob für diese spezifische IP ein echter Push-Datensatz vorliegt (z.B. von POST /sensor-push)
  // Wichtig: solar_outdoor darf NIEMALS als reguläre IP zurückgegeben werden!
  const directPush = pushedSensorCache[rawIp];
  if (directPush && directPush.sensor !== 'solar_outdoor') {
    let timeStr = directPush.time;
    if (timeStr && typeof timeStr === 'string' && !timeStr.endsWith('Z') && !timeStr.includes('+')) {
      timeStr = timeStr + 'Z';
    }
    return res.json({
      success: true,
      online: true,
      ip: rawIp,
      name: directPush.sensor || 'Sensor',
      time: timeStr,
      temperature: directPush.temperature,
      humidity: directPush.humidity,
      dewPoint: directPush.dewPoint,
      tempUnit: 'C',
      batteryPercent: directPush.batteryPercent,
      batteryVoltage: directPush.batteryVoltage
    });
  }

  // 3. Reguläres Tasmota-Gerät per HTTP abfragen
  try {
    const data = await getSensorData(rawIp);
    res.json(data);
  } catch (e) {
    res.json({ success: false, online: false, ip: rawIp, error: e.message });
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
