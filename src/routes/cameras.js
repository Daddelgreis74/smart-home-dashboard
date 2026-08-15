const express = require('express');
const fileStore = require('../utils/fileStore');
const { cleanName } = require('../utils/validation');

const router = express.Router();

router.get('/', (req, res) => {
  res.json(fileStore.camerasRAM);
});

router.get('/stream/:id', (req, res) => {
  try {
    const id = String(req.params.id);
    const camera = fileStore.camerasRAM.find(c => c.id === id);
    if (!camera) {
      return res.status(404).send('Kamera nicht gefunden.');
    }

    const streamUrl = camera.url;

    // SSRF Check: Ensure the host is a private/local IP or hostname
    try {
      const parsedUrl = new URL(streamUrl);
      const host = parsedUrl.hostname;
      const { isPrivateIPv4 } = require('../utils/validation');
      const isLocal = isPrivateIPv4(host) || 
                      host === 'localhost' || 
                      host.endsWith('.local') || 
                      host.endsWith('.lan') || 
                      host.endsWith('.fritz.box');
      if (!isLocal) {
        return res.status(403).send('Zugriff verweigert: Nur private/lokale Adressen erlaubt.');
      }
    } catch(err) {
      return res.status(400).send('Ungültige Stream-URL.');
    }

    const http = require('http');
    const https = require('https');
    const httpClient = streamUrl.toLowerCase().startsWith('https') ? https : http;

    const options = {};
    if (streamUrl.toLowerCase().startsWith('https')) {
      options.rejectUnauthorized = false;
    }

    // Forward request to camera/Go2RTC with timeout
    const clientReq = httpClient.get(streamUrl, options, (clientRes) => {
      const contentType = clientRes.headers['content-type'] || '';
      const isMJPEG = contentType.toLowerCase().includes('multipart/x-mixed-replace');

      let bytesReceived = 0;
      const maxSnapshotBytes = 10 * 1024 * 1024; // Limit snapshots to 10MB to prevent memory exhaustion

      // Set response headers to match the camera stream headers
      res.writeHead(clientRes.statusCode, clientRes.headers);

      clientRes.on('data', (chunk) => {
        if (!isMJPEG) {
          bytesReceived += chunk.length;
          if (bytesReceived > maxSnapshotBytes) {
            console.warn(`[Camera Proxy Warning] Snapshot data limit exceeded for ${camera.name}. Closing connection.`);
            clientRes.destroy();
            res.end();
            return;
          }
        }
        res.write(chunk);
      });

      clientRes.on('end', () => {
        res.end();
      });
    });

    // Set connection timeout to 10 seconds to avoid hanging sockets
    clientReq.setTimeout(10000, () => {
      console.warn(`[Camera Proxy Timeout] Connection timed out after 10s for ${camera.name}`);
      clientReq.destroy();
      if (!res.headersSent) {
        res.status(504).send('Zeitüberschreitung bei der Verbindung zur Kamera.');
      }
    });

    clientReq.on('error', (err) => {
      console.error(`[Camera Proxy Error] Failed to fetch stream for ${camera.name}:`, err.message);
      if (!res.headersSent) {
        res.status(502).send('Verbindung zur Kamera fehlgeschlagen.');
      }
    });

    // Close the upstream connection if the client aborts the request
    req.on('close', () => {
      clientReq.destroy();
    });
  } catch(e) {
    console.error('[Camera Proxy Exception]:', e.message);
    if (!res.headersSent) {
      res.status(500).send('Interner Serverfehler im Kamera-Proxy.');
    }
  }
});

router.post('/', (req, res) => {
  try {
    const { id, name, url, interval, ptz, ptzHost, ptzPort, ptzUser, ptzPass } = req.body;
    const cleanId = String(id || Date.now());
    const cleanN = cleanName(name, 'Kamera');
    const cleanU = String(url || '').trim().slice(0, 800);
    if (!/^https?:\/\//i.test(cleanU)) {
      return res.status(400).json({ success: false, error: 'Ungültige Kamera-URL. Muss mit http:// oder https:// beginnen.' });
    }

    // SSRF Check: Validate host of the saved camera URL
    const { isPrivateIPv4 } = require('../utils/validation');
    try {
      const parsedUrl = new URL(cleanU);
      const host = parsedUrl.hostname;
      const isLocal = isPrivateIPv4(host) || 
                      host === 'localhost' || 
                      host.endsWith('.local') || 
                      host.endsWith('.lan') || 
                      host.endsWith('.fritz.box');
      if (!isLocal) {
        return res.status(400).json({ success: false, error: 'Kamera-URL muss eine private/lokale Adresse sein (z.B. lokale IP oder .local-Domain).' });
      }
    } catch(err) {
      return res.status(400).json({ success: false, error: 'Ungültige Kamera-URL Struktur.' });
    }

    const cleanI = Math.max(0, Number(interval || 0));
    const cleanPtz = ptz === true;
    const cleanPtzHost = String(ptzHost || '').trim().slice(0, 100);
    const cleanPtzPort = Math.min(65535, Math.max(1, Number(ptzPort || 2020)));
    const cleanPtzUser = String(ptzUser || '').trim().slice(0, 100);
    const cleanPtzPass = String(ptzPass || '').slice(0, 200);

    const camerasRAM = fileStore.camerasRAM;
    const index = camerasRAM.findIndex(c => c.id === cleanId);

    const camera = {
      id: cleanId,
      name: cleanN,
      url: cleanU,
      interval: cleanI,
      ptz: cleanPtz,
      ptzHost: cleanPtzHost,
      ptzPort: cleanPtzPort,
      ptzUser: cleanPtzUser,
      ptzPass: cleanPtzPass
    };

    if (index >= 0) {
      camerasRAM[index] = camera;
    } else {
      camerasRAM.push(camera);
    }

    fileStore.saveCameras(camerasRAM);
    res.json({ success: true, camera });

    const io = req.app.get('io');
    if (io) {
      io.emit('cameras-updated', camerasRAM);
    }
  } catch(e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post('/ptz/:id', async (req, res) => {
  try {
    const id = String(req.params.id);
    const camera = fileStore.camerasRAM.find(c => c.id === id);
    if (!camera) {
      return res.status(404).json({ success: false, error: 'Kamera nicht gefunden.' });
    }

    if (!camera.ptz) {
      return res.status(400).json({ success: false, error: 'PTZ ist für diese Kamera nicht aktiviert.' });
    }

    const { direction, speed = 0.5, timeout = 1 } = req.body;
    if (!['up', 'down', 'left', 'right', 'stop'].includes(direction)) {
      return res.status(400).json({ success: false, error: 'Ungültige Bewegungsrichtung.' });
    }

    const parsedUrl = new URL(camera.url);
    const host = camera.ptzHost || parsedUrl.hostname;
    const port = camera.ptzPort || 2020;

    // Helper: Thingino HTTP Motor API fallback
    const tryThinginoMotor = async () => {
      const http = require('http');
      let stepX = 0;
      let stepY = 0;
      const stepMagnitude = 300;
      if (direction === 'left') stepX = -stepMagnitude;
      if (direction === 'right') stepX = stepMagnitude;
      if (direction === 'up') stepY = 200;
      if (direction === 'down') stepY = -200;

      if (direction === 'stop') return true;

      const thinginoUrl = `http://${host}/x/json-motor.cgi?d=g&x=${stepX}&y=${stepY}`;
      return new Promise((resolve, reject) => {
        const req = http.get(thinginoUrl, { timeout: 3000 }, (resp) => {
          if (resp.statusCode === 200) {
            resolve(true);
          } else {
            reject(new Error(`Thingino returned HTTP ${resp.statusCode}`));
          }
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('Thingino timeout')); });
      });
    };

    // If port is 80 or if it's explicitly Thingino, try Thingino motor first
    if (port === 80) {
      try {
        await tryThinginoMotor();
        return res.json({ success: true, direction, type: 'thingino' });
      } catch(e) {
        console.warn('[Thingino PTZ Attempt Failed, trying ONVIF]:', e.message);
      }
    }

    // Try standard ONVIF
    try {
      const onvif = require('node-onvif');
      const device = new onvif.OnvifDevice({
        xaddr: `http://${host}:${port}/onvif/device_service`,
        user: camera.ptzUser || '',
        pass: camera.ptzPass || ''
      });

      await device.init();

      if (direction === 'stop') {
        await device.ptzStop();
        return res.json({ success: true, action: 'stop' });
      }

      const moveSpeed = { x: 0, y: 0, z: 0 };
      const s = Math.min(1.0, Math.max(0.1, Number(speed) || 0.5));
      if (direction === 'left') moveSpeed.x = -s;
      if (direction === 'right') moveSpeed.x = s;
      if (direction === 'up') moveSpeed.y = s;
      if (direction === 'down') moveSpeed.y = -s;

      await device.ptzMove({
        speed: moveSpeed,
        timeout: Math.min(5, Math.max(0.5, Number(timeout) || 1))
      });

      return res.json({ success: true, direction, type: 'onvif' });
    } catch(onvifErr) {
      // ONVIF failed - try Thingino motor fallback
      try {
        await tryThinginoMotor();
        return res.json({ success: true, direction, type: 'thingino-fallback' });
      } catch(thinginoErr) {
        throw new Error(`ONVIF (${onvifErr.message}) and Thingino (${thinginoErr.message}) both failed`);
      }
    }
  } catch (err) {
    console.error('[Camera PTZ Error]:', err.message);
    res.status(500).json({ success: false, error: err.message || 'PTZ-Steuerung fehlgeschlagen.' });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const id = String(req.params.id);
    const camerasRAM = fileStore.camerasRAM;
    const index = camerasRAM.findIndex(c => c.id === id);
    if (index >= 0) {
      camerasRAM.splice(index, 1);
      fileStore.saveCameras(camerasRAM);
      res.json({ success: true });

      const io = req.app.get('io');
      if (io) {
        io.emit('cameras-updated', camerasRAM);
      }
    } else {
      res.status(404).json({ success: false, error: 'Kamera nicht gefunden.' });
    }
  } catch(e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;

