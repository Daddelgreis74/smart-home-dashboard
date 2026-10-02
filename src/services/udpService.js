const dgram = require('dgram');

let udpSocket = null;
const lastLogPerSensor = new Map();

function logUdpRateLimited(sensorName, address, port) {
  const now = Date.now();
  const lastTime = lastLogPerSensor.get(sensorName) || 0;
  if (now - lastTime >= 60000) {
    lastLogPerSensor.set(sensorName, now);
    console.log(`[UDP Service] Messdaten empfangen von Sensor '${sensorName}' (${address}:${port})`);
  }
}

/**
 * Initialisiert den UDP-Broadcast Empfänger für Sensoren (z.B. solarbetriebener Außensensor)
 * @param {object} io - Socket.io Instanz zur Weiterleitung an verbundene Web-Clients
 * @param {number} [port=8888] - UDP Port (Standard: 8888)
 * @param {string} [host='0.0.0.0'] - Bind-Adresse
 * @returns {dgram.Socket|null} Der erstellte UDP Socket
 */
function initUdpListener(io, port = 8888, host = '0.0.0.0') {
  if (udpSocket) {
    try {
      udpSocket.close();
    } catch (_) {}
    udpSocket = null;
  }

  try {
    const socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });

    socket.on('error', (err) => {
      console.error('[UDP Service] Socket-Fehler:', err.message);
      // Socket nicht hart crashen lassen
      try {
        socket.close();
      } catch (_) {}
    });

    socket.on('message', (msg, rinfo) => {
      // 1. Datagramme über 2 KB sofort verwerfen
      if (!msg || msg.length > 2048) {
        return;
      }

      try {
        const text = msg.toString('utf8');
        const data = JSON.parse(text);

        if (typeof data !== 'object' || data === null) {
          console.warn(`[UDP Service] Ungültige Nutzlast von ${rinfo.address}:${rinfo.port}`);
          return;
        }

        // 2. Sensornamen validieren (z.B. solar_outdoor)
        const sensorName = data.sensor;
        if (typeof sensorName !== 'string' || !/^[A-Za-z0-9_-]{1,32}$/.test(sensorName)) {
          return;
        }

        // 3. Rate-limited logging (ohne volles Payload-Objekt, max. 1x/min pro Sensor)
        logUdpRateLimited(sensorName, rinfo.address, rinfo.port);

        // 4. Mit Sender-IP und Empfangszeit anreichern
        const enriched = {
          ...data,
          senderIp: rinfo.address,
          receivedAt: new Date().toISOString()
        };

        // 5. Lokalen Cache in tasmota route aktualisieren und bereinigten Eintrag abholen
        let cleanedEntry = null;
        try {
          const tasmotaRoute = require('../routes/tasmota');
          if (tasmotaRoute && typeof tasmotaRoute.updatePushedSensor === 'function') {
            cleanedEntry = tasmotaRoute.updatePushedSensor(rinfo.address, enriched);
          }
        } catch (_) {}

        // 6. Nur den bereinigten Eintrag an Clients senden; wenn nichts Gültiges drin war, nichts senden
        if (cleanedEntry && io) {
          io.emit('sensor_update', cleanedEntry);
          io.emit('sensor-update', { ip: rinfo.address, data: cleanedEntry });
        }

      } catch (parseErr) {
        console.warn(`[UDP Service] JSON-Parse-Fehler von ${rinfo.address}:${rinfo.port}:`, parseErr.message);
      }
    });

    socket.on('listening', () => {
      const address = socket.address();
      console.log(`[UDP Service] Lauscht auf UDP ${address.address}:${address.port} für Außensensor-Broadcasts`);
    });

    socket.bind({ port, address: host, exclusive: false }, () => {
      try {
        socket.setBroadcast(true);
      } catch (bErr) {
        console.warn('[UDP Service] Warnung beim Setzen von setBroadcast:', bErr.message);
      }
    });

    udpSocket = socket;
    return socket;
  } catch (err) {
    console.error('[UDP Service] Initialisierungsfehler:', err.message);
    return null;
  }
}

/**
 * Schließt den UDP Socket (z.B. für sauberes Test-Teardown)
 */
function closeUdpListener() {
  if (udpSocket) {
    try {
      udpSocket.close();
    } catch (_) {}
    udpSocket = null;
  }
}

module.exports = {
  initUdpListener,
  closeUdpListener
};
