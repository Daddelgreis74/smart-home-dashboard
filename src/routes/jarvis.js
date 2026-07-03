const express = require('express');
const fs = require('fs');
const { CONFIG_FILE } = require('../config/env');

const router = express.Router();

router.post('/chat', async (req, res) => {
  const { provider, model, payload } = req.body;

  if (!provider || !model || !payload) {
    return res.status(400).json({ success: false, error: 'Provider, Model oder Payload fehlt.' });
  }

  let apiKey = '';
  try {
    const config = fs.existsSync(CONFIG_FILE)
      ? JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'))
      : {};

    if (provider === 'gemini') {
      apiKey = config.jarvis_gemini_api_key;
    } else if (provider === 'openrouter') {
      apiKey = config.jarvis_openrouter_api_key;
    }
  } catch (e) {
    console.error('[Jarvis Router] Fehler beim Lesen der Config:', e.message);
  }

  if (!apiKey) {
    return res.status(400).json({ success: false, error: `API-Key für Provider "${provider}" ist nicht konfiguriert.` });
  }

  let url = '';
  const headers = {
    'Content-Type': 'application/json'
  };

  if (provider === 'gemini') {
    url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  } else if (provider === 'openrouter') {
    url = 'https://openrouter.ai/api/v1/chat/completions';
    headers['Authorization'] = `Bearer ${apiKey}`;
    headers['HTTP-Referer'] = req.headers.referer || req.headers.origin || 'http://localhost:8443';
    headers['X-Title'] = 'Neo Deck Smart Home';
  } else {
    return res.status(400).json({ success: false, error: `Ungültiger Provider: ${provider}` });
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      return res.status(response.status).json({
        success: false,
        error: errData.error?.message || `Upstream API Fehler ${response.status}`
      });
    }

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('[Jarvis Router] Proxy-Fehler:', err.message);
    res.status(500).json({ success: false, error: `Verbindung zur API fehlgeschlagen: ${err.message}` });
  }
});

module.exports = router;
