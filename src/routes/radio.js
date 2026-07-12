const express = require('express');
const fs = require('fs');
const { RADIO_FILE } = require('../config/env');
const { sanitizeStations } = require('../utils/validation');
const { validateAndStream } = require('../services/proxyService');

const router = express.Router();

router.get('/', (req, res) => {
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

router.post('/', (req, res) => {
  try {
    const cleaned = sanitizeStations(req.body);
    fs.writeFileSync(RADIO_FILE, JSON.stringify(cleaned, null, 2));
    res.json({ success: true });
    
    const io = req.app.get('io');
    if (io) {
      io.emit('radio-updated', cleaned);
    }
  } catch(e) {
    res.json({ success: false });
  }
});

router.get('/proxy-stream', (req, res) => {
  const streamUrl = req.query.url;
  validateAndStream(streamUrl, req, res);
});

// External control endpoint for webhooks (e.g., Tasker/MacroDroid)
router.all('/control', (req, res) => {
  const action = req.query.action || req.body.action || 'toggle';
  const allowedActions = ['play', 'pause', 'toggle', 'stop'];
  if (!allowedActions.includes(action)) {
    return res.status(400).json({ error: 'Invalid action. Use play, pause, stop, or toggle.' });
  }

  const io = req.app.get('io');
  if (io) {
    io.emit('radio-control', { action });
  }

  res.json({ success: true, action });
});

module.exports = router;
