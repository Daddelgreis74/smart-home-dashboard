const express = require('express');

const router = express.Router();

router.get('/', async (req, res) => {
  const query = String(req.query.q || '').trim();
  const apiKey = String(req.headers['x-brave-key'] || '').trim();

  if (!query) {
    return res.status(400).json({ success: false, error: 'Query parameter q is required' });
  }
  if (!apiKey) {
    return res.status(400).json({ success: false, error: 'Brave Search API key is missing' });
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
