const express = require('express');
const http = require('http');
const https = require('https');
const { Server } = require('socket.io');
const { PORT, HOST, UPLOAD_DIR } = require('./src/config/env');
const { runMigration } = require('./src/config/migration');
const { initializeSSL } = require('./src/config/ssl');
const { initSockets } = require('./src/sockets');
const { initFritzboxConnections, pollPresence } = require('./src/services/fritzboxService');

// 1. Führe eventuelle Migrationen alter Pfade/Dateien durch
runMigration();

// 2. Initialisiere SSL-Optionen (erstellt Zertifikat bei AUTO_SSL=true)
const { useSSL, sslOptions } = initializeSSL();

// 3. Express App Setup
const app = express();
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
app.use('/api/search', require('./src/routes/search'));
app.use('/api/elevenlabs', require('./src/routes/tts'));

// 7. Realtime Sockets & Services initialisieren
initSockets(io);
initFritzboxConnections(io);

// 8. Presence-Polling starten (Fritz!Box-Abfrage)
setInterval(pollPresence, 30000);
setTimeout(pollPresence, 5000);

// 9. Server starten
if (require.main === module) {
  server.listen(PORT, HOST, () => {
    const protocol = useSSL ? 'https' : 'http';
    console.log(`Server läuft auf ${protocol}://${HOST}:${PORT}`);
  });
}

module.exports = app;
