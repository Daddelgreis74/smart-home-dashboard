const express = require('express');
const fs = require('fs');
const { CONFIG_FILE } = require('../config/env');
const { safeWriteFileSync, getPermissionStatus } = require('../utils/fileStore');

const { validateConfigStructure } = require('../utils/validation');

const router = express.Router();

const ALLOWED_CONFIG_KEYS = new Set([
  'dashboard_theme',
  'dashboard_lang',
  'temp_sensor_ip',
  'tasmota_scan_subnet',
  'widgetLayout',
  'stations',
  // J.A.R.V.I.S.
  'jarvis_api_provider',
  'jarvis_provider',
  'jarvis_gemini_api_key',
  'jarvis_openrouter_api_key',
  'jarvis_brave_api_key',
  'jarvis_eleven_api_key',
  'jarvis_gemini_model',
  'jarvis_openrouter_model',
  'jarvis_model',
  'jarvis_custom_model',
  'jarvis_eleven_voice_id',
  'jarvis_system_prompt',
  'jarvis_search_enabled',
  'jarvis_speech_output_enabled',
  'jarvis_tts_enabled',
  'jarvis_tts_provider',
  'jarvis_unified_voice',
  'jarvis_local_voice_name',
  'jarvis_eleven_voices_cache',
  'jarvis_history',
  'jarvis_chat_history',
  'sensorIp',
  'sensorList',
  'tasmotaBackup',
  // Wetter
  'weather_location',
  'weather_provider',
  'weather_api_key',
  'weather_lat',
  'weather_lon',
  'weather_loc_resolved'
]);

const SENSIBLE_KEYS = [
  'jarvis_gemini_api_key',
  'jarvis_openrouter_api_key',
  'jarvis_brave_api_key',
  'jarvis_eleven_api_key',
  'weather_api_key'
];

router.get('/', (req, res) => {
  try {
    const data = fs.existsSync(CONFIG_FILE)
      ? JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'))
      : {};
    
    // Mask sensitive keys
    const responseData = { ...data };
    SENSIBLE_KEYS.forEach(key => {
      if (responseData[key]) {
        responseData[key] = '********';
      }
    });

    responseData.server_permission_error = getPermissionStatus();

    res.json(responseData);
  } catch (e) {
    console.error('Config lesen fehlgeschlagen:', e.message);
    res.json({});
  }
});

router.post('/', (req, res) => {
  if (!validateConfigStructure(req.body)) {
    return res.status(400).json({ ok: false, error: 'Ungültiges Konfigurationsformat' });
  }

  const toSave = { ...req.body };
  delete toSave.server_permission_error;

  // Whitelist-Validierung der Konfigurationsschlüssel
  const keys = Object.keys(toSave);
  const invalidKey = keys.find(k => !ALLOWED_CONFIG_KEYS.has(k));
  if (invalidKey) {
    return res.status(400).json({ ok: false, error: `Ungültiger Konfigurationsschlüssel: ${invalidKey}` });
  }

  try {
    // Lade die existierende Config, um Maskierungen wiederherzustellen
    const existing = fs.existsSync(CONFIG_FILE)
      ? JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'))
      : {};

    SENSIBLE_KEYS.forEach(key => {
      if (toSave[key] === '********') {
        toSave[key] = existing[key] || '';
      }
    });

    safeWriteFileSync(CONFIG_FILE, JSON.stringify(toSave, null, 2), 'utf8');
    res.json({ ok: true });
  } catch (e) {
    console.error('Config schreiben fehlgeschlagen:', e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.patch('/:key', (req, res) => {
  const key = req.params.key;
  if (!ALLOWED_CONFIG_KEYS.has(key)) {
    return res.status(400).json({ ok: false, error: `Ungültiger Konfigurationsschlüssel: ${key}` });
  }
  try {
    const cfg = fs.existsSync(CONFIG_FILE)
      ? JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'))
      : {};

    const value = req.body.value;
    if (SENSIBLE_KEYS.includes(key) && value === '********') {
      // Wenn der Wert maskiert gesendet wurde, lassen wir den echten Wert unverändert
    } else {
      cfg[key] = value;
    }

    safeWriteFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), 'utf8');
    res.json({ ok: true });
  } catch (e) {
    console.error('Config key aktualisieren fehlgeschlagen:', e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = router;
