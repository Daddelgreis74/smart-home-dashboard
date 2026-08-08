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
  'weather_loc_resolved',
  'setup_completed'
]);

const SENSIBLE_KEYS = [
  'jarvis_gemini_api_key',
  'jarvis_openrouter_api_key',
  'jarvis_brave_api_key',
  'jarvis_eleven_api_key',
  'weather_api_key'
];

router.get('/status', (req, res) => {
  try {
    let needsSetup = true;
    if (fs.existsSync(CONFIG_FILE)) {
      const cfg = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      if (cfg.setup_completed === true) {
        needsSetup = false;
      }
    }
    res.json({ success: true, needsSetup });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

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

let activeResetToken = null;
let resetTokenExpiry = 0;

router.get('/factory-reset-token', (req, res) => {
  try {
    const crypto = require('crypto');
    const token = crypto.randomBytes(32).toString('hex');
    activeResetToken = token;
    resetTokenExpiry = Date.now() + 60 * 1000; // 60 Sekunden Gültigkeit
    res.json({ token });
  } catch (e) {
    console.error('Factory Reset Token Generierung fehlgeschlagen:', e.message);
    res.status(500).json({ error: e.message });
  }
});

router.post('/factory-reset', (req, res) => {
  const { token } = req.body;
  if (!token || token !== activeResetToken || Date.now() > resetTokenExpiry) {
    console.warn('[Security Warning] Ungültiger, abgelaufener oder fehlender Reset-Token!');
    return res.status(403).json({ ok: false, error: 'Sicherheits-Token ungültig oder abgelaufen' });
  }

  // Einweg-Token entwerten
  activeResetToken = null;
  resetTokenExpiry = 0;

  try {
    const path = require('path');
    const { 
      TASMOTA_FILE, 
      FRITZ_FILE, 
      CALLS_LOG_FILE, 
      PRESENCE_FILE, 
      CAMERAS_FILE, 
      APPOINTMENTS_FILE,
      RADIO_FILE,
      CONFIG_FILE,
      UPLOAD_DIR
    } = require('../config/env');
    
    // Alle Konfigurationsdateien löschen
    const filesToDelete = [
      TASMOTA_FILE, 
      FRITZ_FILE, 
      CALLS_LOG_FILE, 
      PRESENCE_FILE, 
      CAMERAS_FILE, 
      APPOINTMENTS_FILE,
      RADIO_FILE,
      CONFIG_FILE
    ];
    
    filesToDelete.forEach(file => {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
        console.log(`[Factory Reset] Gelöscht: ${file}`);
      }
    });

    // Upload-Verzeichnis bereinigen
    if (fs.existsSync(UPLOAD_DIR)) {
      const uploadFiles = fs.readdirSync(UPLOAD_DIR);
      uploadFiles.forEach(file => {
        const filePath = path.join(UPLOAD_DIR, file);
        if (fs.statSync(filePath).isFile()) {
          fs.unlinkSync(filePath);
        }
      });
      console.log('[Factory Reset] Uploads-Ordner geleert');
    }

    // Cache-Referenzen im Dateispeicher zurücksetzen
    try {
      const fileStore = require('../utils/fileStore');
      fileStore.tasmotaRAM = [];
      fileStore.fritzConfig = {};
      fileStore.fritzCalls = [];
      fileStore.activeCalls = {};
      fileStore.presenceRAM = [];
      fileStore.camerasRAM = [];
      fileStore.appointmentsRAM = [];
    } catch (cacheErr) {
      console.warn('[Factory Reset] RAM-Cache Zurücksetzen übersprungen:', cacheErr.message);
    }

    console.log('[Factory Reset] Dashboard erfolgreich auf Werkseinstellungen zurückgesetzt!');
    res.json({ ok: true });
  } catch (e) {
    console.error('Factory Reset fehlgeschlagen:', e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.post('/setup', (req, res) => {
  const { config, fritzbox, tasmota } = req.body;
  if (!config || !validateConfigStructure(config)) {
    return res.status(400).json({ success: false, error: 'Ungültige Konfiguration' });
  }

  const toSave = { ...config, setup_completed: true };
  delete toSave.server_permission_error;

  const keys = Object.keys(toSave);
  const invalidKey = keys.find(k => !ALLOWED_CONFIG_KEYS.has(k));
  if (invalidKey) {
    return res.status(400).json({ success: false, error: `Ungültiger Konfigurationsschlüssel: ${invalidKey}` });
  }

  try {
    // General config speichern
    safeWriteFileSync(CONFIG_FILE, JSON.stringify(toSave, null, 2), 'utf8');

    // Tasmota-Geräte speichern falls vorhanden
    if (tasmota && Array.isArray(tasmota)) {
      const fileStore = require('../utils/fileStore');
      fileStore.saveTasmota(tasmota);
    }

    // Fritz!Box config speichern falls IP vorhanden
    if (fritzbox && fritzbox.ip) {
      const fileStore = require('../utils/fileStore');
      fileStore.saveFritzConfig({
        ip: fritzbox.ip,
        user: fritzbox.user || '',
        pass: fritzbox.pass || '',
        callMonitorEnabled: fritzbox.callMonitorEnabled !== false
      });
      // Initialisiere Fritz!Box-Verbindungen falls socket.io läuft
      try {
        const io = req.app.get('io');
        const { initFritzboxConnections } = require('../services/fritzboxService');
        initFritzboxConnections(io);
      } catch (err) {
        console.warn('[Setup] Fritz!Box-Verbindungsaufbau fehlgeschlagen:', err.message);
      }
    }

    res.json({ success: true });
  } catch (e) {
    console.error('Setup fehlgeschlagen:', e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;
