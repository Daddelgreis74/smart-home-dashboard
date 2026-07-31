const express = require('express');
const fs = require('fs');
const { CONFIG_FILE } = require('../config/env');

const router = express.Router();

function getBraveApiKey(headerKey) {
  let key = String(headerKey || '').trim();
  if (key === '********') {
    try {
      if (fs.existsSync(CONFIG_FILE)) {
        const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
        key = String(config.jarvis_brave_api_key || '').trim();
      }
    } catch (e) {
      console.error('[Search] Failed to read Brave key from config:', e.message);
    }
  }
  return key;
}

router.get('/', async (req, res) => {
  const query = String(req.query.q || '').trim();
  const apiKey = getBraveApiKey(req.headers['x-brave-key']);

  if (!query) {
    return res.status(400).json({ success: false, error: 'Query parameter q is required' });
  }
  if (!apiKey || apiKey === '********') {
    return res.status(400).json({ success: false, error: 'Brave Search API key is missing or invalid' });
  }

  try {
    const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`;
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'X-Subscription-Token': apiKey
      }
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`Brave API error (status ${response.status}): ${errText}`);
    }

    const data = await response.json();
    const rawResults = data.web?.results || [];
    const results = rawResults.map(r => ({
      title: r.title || '',
      url: r.url || '',
      snippet: r.description || ''
    }));

    res.json({ success: true, results });
  } catch (err) {
    console.error('[Search] Brave search failed:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
