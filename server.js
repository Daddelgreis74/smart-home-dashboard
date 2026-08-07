const express = require('express');
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { Server } = require('socket.io');
const { PORT, HOST, UPLOAD_DIR } = require('./src/config/env');
const { runMigration } = require('./src/config/migration');
const { initializeSSL } = require('./src/config/ssl');
const { initSockets } = require('./src/sockets');
const { initFritzboxConnections, pollPresence } = require('./src/services/fritzboxService');

// Globales Error-Handling zur Vermeidung von Abstürzen bei unerwarteten Fehlern
process.on('uncaughtException', (err) => {
  console.error('[CRITICAL] Uncaught Exception:', err.stack || err.message || err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[CRITICAL] Unhandled Rejection at:', promise, 'reason:', reason);
});

// 1. Führe eventuelle Migrationen alter Pfade/Dateien durch
runMigration();

// 2. Initialisiere SSL-Optionen (erstellt Zertifikat bei AUTO_SSL=true)
const { useSSL, sslOptions } = initializeSSL();

// 3. Express App Setup
const app = express();

// Custom route to dynamically serve index.html with automatic version cache busting
app.get(['/', '/index.html'], (req, res) => {
  const indexPath = path.join(__dirname, 'public', 'index.html');
  if (fs.existsSync(indexPath)) {
    try {
      let html = fs.readFileSync(indexPath, 'utf8');
      const { version } = require('./package.json');
      html = html.replace(/\?v=[0-9.]+/g, `?v=${version}`);
      res.send(html);
    } catch (err) {
      console.error('[Server] Fehler beim dynamischen Rendern von index.html:', err.message);
      res.sendFile(indexPath);
    }
  } else {
    res.status(404).send('Not Found');
  }
});

app.use(express.static('public'));
app.use('/uploads', express.static(UPLOAD_DIR));
app.use(express.json({ limit: '256kb' }));

// 4. HTTP oder HTTPS Server erstellen
const server = useSSL ? https.createServer(sslOptions, app) : http.createServer(app);

// 5. Socket.io initialisieren
const io = new Server(server);
app.set('io', io); // Macht 'io' in Routern über req.app.get('io') verfügbar

// 6. API-Routen registrieren
app.use('/api/config', require('./src/routes/config'));
app.use('/api/tasmota', require('./src/routes/tasmota'));
app.use('/api/fritzbox', require('./src/routes/fritzbox'));
app.use('/api/presence', require('./src/routes/presence'));
app.use('/api/radio', require('./src/routes/radio'));
app.use('/api/appointments', require('./src/routes/appointments'));
app.use('/api/cameras', require('./src/routes/cameras'));
app.use('/api/weather', require('./src/routes/weather'));
app.use('/api/search', require('./src/routes/search'));
app.use('/api/elevenlabs', require('./src/routes/tts'));
app.use('/api/jarvis', require('./src/routes/jarvis'));

// Version endpoint – serves current app version from package.json
app.get('/api/version', (req, res) => {
  const { version } = require('./package.json');
  res.json({ version });
});

// 9. Server starten & Services initialisieren (nur wenn direkt gestartet)
if (require.main === module) {
  // Realtime Sockets & Services initialisieren
  initSockets(io);
  initFritzboxConnections(io);

  // Presence-Polling starten (Fritz!Box-Abfrage)
  setInterval(pollPresence, 30000);
  setTimeout(pollPresence, 5000);

  server.listen(PORT, HOST, () => {
    const protocol = useSSL ? 'https' : 'http';
    console.log(`Server läuft auf ${protocol}://${HOST}:${PORT}`);
  });

  // Secondary HTTP-to-HTTPS Redirect Server
  const REDIRECT_PORT = process.env.REDIRECT_PORT || (useSSL && PORT === 8443 ? 8080 : null);
  if (useSSL && REDIRECT_PORT) {
    http.createServer((req, res) => {
      if (req.url && req.url.startsWith('/api/tasmota/sensor-push')) {
        // Pass unencrypted sensor push requests directly to express app without redirecting
        app(req, res);
      } else {
        const hostHeader = req.headers.host || '';
        const host = hostHeader.split(':')[0];
        const redirectUrl = `https://${host}:${PORT}${req.url}`;
        res.writeHead(301, { Location: redirectUrl });
        res.end();
      }
    }).listen(REDIRECT_PORT, HOST, () => {
      console.log(`HTTP-Redirect-Server läuft auf http://${HOST}:${REDIRECT_PORT} -> https://${HOST}:${PORT}`);
    });
  }
}

module.exports = app;
