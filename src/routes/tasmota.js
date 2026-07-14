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
  const results = await getDeviceStatus(devices);
  res.json(results);
});

router.get('/sensor', async (req, res) => {
  const ip = String(req.query?.ip || '192.168.178.40').trim();
  if (!isPrivateIPv4(ip)) return res.status(400).json({ success: false, error: 'Ungültige lokale IPv4-Adresse' });

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
