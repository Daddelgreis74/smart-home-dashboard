const dns = require('dns');
const http = require('http');
const https = require('https');
const { URL } = require('url');

function validateAndStream(streamUrl, req, res) {
  if (!streamUrl) {
    return res.status(400).send('Missing url parameter');
  }

  if (!/^https?:\/\//i.test(streamUrl)) {
    return res.status(400).send('Invalid url protocol');
  }

  try {
    const parsedUrl = new URL(streamUrl);
    const hostname = parsedUrl.hostname;

    if (hostname === 'localhost' || hostname === 'localhost.localdomain' || hostname === '[::1]') {
      return res.status(403).send('Access to loopback interface is restricted');
    }

    dns.lookup(hostname, (err, address) => {
      if (err) {
        return res.status(400).send('DNS Resolution failed');
      }

      if (address === '127.0.0.1' || address === '::1' || address.startsWith('127.')) {
        console.warn(`[Proxy Blocked] Attempted SSRF to loopback IP: ${address} (${streamUrl})`);
        return res.status(403).send('Access to loopback IP addresses is restricted');
      }

      console.log(`[Proxy] Routing HTTP stream through secure HTTPS proxy: ${streamUrl}`);

      const clientModule = streamUrl.startsWith('https') ? https : http;

      const proxyReq = clientModule.get(streamUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      }, (proxyRes) => {
        res.writeHead(proxyRes.statusCode, {
          'Content-Type': proxyRes.headers['content-type'] || 'audio/mpeg',
          'Transfer-Encoding': 'chunked',
          'Connection': 'keep-alive',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Expires': '0'
        });

        proxyRes.pipe(res);
      });

      proxyReq.on('error', (err) => {
        console.error(`[Proxy Error] Failed to stream audio from ${streamUrl}:`, err.message);
        if (!res.headersSent) {
          res.status(500).send('Failed to stream audio');
        }
      });

      req.on('close', () => {
        proxyReq.destroy();
      });
    });
  } catch (e) {
    return res.status(400).send('Invalid URL format');
  }
}

module.exports = {
  validateAndStream
};
