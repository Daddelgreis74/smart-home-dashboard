const express = require('express');
const fs = require('fs');
const { CONFIG_FILE } = require('../config/env');
const { safeWriteFileSync } = require('../utils/fileStore');

const { validateConfigStructure } = require('../utils/validation');

const router = express.Router();

const ALLOWED_CONFIG_KEYS = new Set([
  'dashboard_theme',
  'dashboard_lang',
  'temp_sensor_ip',
  'tasmota_scan_subnet',
  'widgetLayout',
  'stations',
  'jarvis_api_provider',
  'jarvis_gemini_api_key',
  'jarvis_openrouter_api_key',
  'jarvis_brave_api_key',
  'jarvis_eleven_api_key',
  'jarvis_gemini_model',
  'jarvis_openrouter_model',
  'jarvis_eleven_voice_id',
  'jarvis_system_prompt',
  'jarvis_search_enabled',
  'jarvis_speech_output_enabled',
  'jarvis_history'
]);

router.get('/', (req, res) => {
  try {
    const data = fs.existsSync(CONFIG_FILE)
      ? JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'))
      : {};
    res.json(data);
  } catch (e) {
    console.error('Config lesen fehlgeschlagen:', e.message);
    res.json({});
  }
});

router.post('/', (req, res) => {
  if (!validateConfigStructure(req.body)) {
    return res.status(400).json({ ok: false, error: 'Ungültiges Konfigurationsformat' });
  }

  // Whitelist-Validierung der Konfigurationsschlüssel
  const keys = Object.keys(req.body);
  const invalidKey = keys.find(k => !ALLOWED_CONFIG_KEYS.has(k));
  if (invalidKey) {
    return res.status(400).json({ ok: false, error: `Ungültiger Konfigurationsschlüssel: ${invalidKey}` });
  }

  try {
    safeWriteFileSync(CONFIG_FILE, JSON.stringify(req.body, null, 2), 'utf8');
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
    cfg[key] = req.body.value;
    safeWriteFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), 'utf8');
    res.json({ ok: true });
  } catch (e) {
    console.error('Config key aktualisieren fehlgeschlagen:', e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = router;
