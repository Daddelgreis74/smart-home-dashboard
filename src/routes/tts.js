const express = require('express');
const fs = require('fs');
const { CONFIG_FILE } = require('../config/env');

const router = express.Router();

function getElevenLabsApiKey(headerKey) {
  let key = String(headerKey || '').trim();
  if (key === '********') {
    try {
      if (fs.existsSync(CONFIG_FILE)) {
        const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
        key = String(config.jarvis_eleven_api_key || '').trim();
      }
    } catch (e) {
      console.error('[TTS] Failed to read ElevenLabs key from config:', e.message);
    }
  }
  return key;
}

router.get('/voices', async (req, res) => {
  const apiKey = getElevenLabsApiKey(req.headers['x-elevenlabs-key']);

  if (!apiKey || apiKey === '********') {
    return res.status(400).json({ success: false, error: 'ElevenLabs API key is missing or invalid' });
  }

  try {
    const url = 'https://api.elevenlabs.io/v1/voices';
    const response = await fetch(url, {
      headers: {
        'xi-api-key': apiKey,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`ElevenLabs API error (status ${response.status}): ${errText}`);
    }

    const data = await response.json();
    res.json({ success: true, voices: data.voices || [] });
  } catch (err) {
    console.error('[TTS] ElevenLabs voices fetch failed:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/tts', async (req, res) => {
  const apiKey = getElevenLabsApiKey(req.headers['x-elevenlabs-key']);
  const text = String(req.body.text || '').trim();
  const voiceId = String(req.body.voiceId || 'nPczCjzI2devNBz1zQrb').trim(); // Brian default

  if (!apiKey || apiKey === '********') {
    return res.status(400).json({ success: false, error: 'ElevenLabs API key is missing or invalid' });
  }
  if (!text) {
    return res.status(400).json({ success: false, error: 'Text parameter is required' });
  }

  try {
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        'accept': 'audio/mpeg'
      },
      body: JSON.stringify({
        text: text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75
        }
      })
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`ElevenLabs API error (status ${response.status}): ${errText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    res.setHeader('Content-Type', 'audio/mpeg');
    res.send(buffer);
  } catch (err) {
    console.error('[TTS] ElevenLabs TTS failed:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
});

module.exports = router;
