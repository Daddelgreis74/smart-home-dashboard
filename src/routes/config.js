const express = require('express');
const fs = require('fs');
const { CONFIG_FILE } = require('../config/env');
const { safeWriteFileSync } = require('../utils/fileStore');

const { validateConfigStructure } = require('../utils/validation');

const router = express.Router();

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
  try {
    safeWriteFileSync(CONFIG_FILE, JSON.stringify(req.body, null, 2), 'utf8');
    res.json({ ok: true });
  } catch (e) {
    console.error('Config schreiben fehlgeschlagen:', e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.patch('/:key', (req, res) => {
  try {
    const cfg = fs.existsSync(CONFIG_FILE)
      ? JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'))
      : {};
    cfg[req.params.key] = req.body.value;
    safeWriteFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), 'utf8');
    res.json({ ok: true });
  } catch (e) {
    console.error('Config key aktualisieren fehlgeschlagen:', e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = router;
