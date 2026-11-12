const dns = require('dns');
const http = require('http');
const https = require('https');
const { URL } = require('url');

function resolveAndValidateUrl(streamUrl, callback) {
  if (!streamUrl || typeof streamUrl !== 'string') {
    return callback({ status: 400, message: 'Missing url parameter' });
  }

  if (!/^https?:\/\//i.test(streamUrl)) {
    return callback({ status: 400, message: 'Invalid url protocol' });
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(streamUrl);
  } catch (e) {
    return callback({ status: 400, message: 'Invalid URL format' });
  }

  const hostname = parsedUrl.hostname;
  if (hostname === 'localhost' || hostname === 'localhost.localdomain' || hostname === '[::1]') {
    return callback({ status: 403, message: 'Access to loopback interface is restricted' });
  }

  dns.lookup(hostname, { all: true }, (err, addresses) => {
    if (err) {
      return callback({ status: 400, message: 'DNS Resolution failed' });
    }

    const addressesArr = Array.isArray(addresses) ? addresses : [addresses];
    const hasLoopback = addressesArr.some(addr => {
      const ip = addr.address;
      return ip === '127.0.0.1' || ip === '::1' || ip.startsWith('127.');
    });

    if (hasLoopback) {
      console.warn(`[Proxy Blocked] Attempted SSRF to loopback IP: ${JSON.stringify(addressesArr)} (${streamUrl})`);
      return callback({ status: 403, message: 'Access to loopback IP addresses is restricted' });
    }

    callback(null, parsedUrl);
  });
}

function validateAndStream(streamUrl, req, res) {
  resolveAndValidateUrl(streamUrl, (err) => {
    if (err) {
      return res.status(err.status).send(err.message);
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

    proxyReq.on('error', (proxyErr) => {
      console.error(`[Proxy Error] Failed to stream audio from ${streamUrl}:`, proxyErr.message);
      if (!res.headersSent) {
        res.status(500).send('Failed to stream audio');
      }
    });

    req.on('close', () => {
      proxyReq.destroy();
    });
  });
}

function checkStreamStatus(streamUrl, timeoutMs = 4500) {
  return new Promise((resolve) => {
    resolveAndValidateUrl(streamUrl, (err) => {
      if (err) {
        return resolve({ url: streamUrl, ok: false, status: err.status, error: err.message });
      }

      const clientModule = streamUrl.startsWith('https') ? https : http;
      let settled = false;
      const finish = (result) => {
        if (settled) return;
        settled = true;
        resolve(result);
      };

      const checkReq = clientModule.get(streamUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      }, (checkRes) => {
        const statusCode = checkRes.statusCode || 0;
        const ok = statusCode >= 200 && statusCode < 400;
        checkRes.destroy();
        checkReq.destroy();
        finish({ url: streamUrl, ok, status: statusCode });
      });

      checkReq.setTimeout(timeoutMs, () => {
        checkReq.destroy();
        finish({ url: streamUrl, ok: false, status: 0, error: 'timeout' });
      });

      checkReq.on('error', (reqErr) => {
        finish({ url: streamUrl, ok: false, status: 0, error: reqErr.message });
      });
    });
  });
}

module.exports = {
  validateAndStream,
  checkStreamStatus
};
