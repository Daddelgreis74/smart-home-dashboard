const path = require('path');
const fs = require('fs');

const PORT = Number(process.env.PORT || 8443);
const HOST = process.env.HOST || '0.0.0.0';

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', '..', 'data');
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(DATA_DIR, 'uploads');
const SSL_DIR = process.env.SSL_DIR || path.join(DATA_DIR, 'ssl');

const TASMOTA_FILE = path.join(DATA_DIR, 'tasmota.json');
const RADIO_FILE = path.join(DATA_DIR, 'radio.json');
const CAMERAS_FILE = path.join(DATA_DIR, 'cameras.json');
const APPOINTMENTS_FILE = path.join(DATA_DIR, 'appointments.json');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');
const FRITZ_FILE = path.join(DATA_DIR, 'fritzbox.json');
const CALLS_LOG_FILE = path.join(DATA_DIR, 'fritzbox_calls.json');
const PRESENCE_FILE = path.join(DATA_DIR, 'presence.json');

const sslKeyPath = path.join(SSL_DIR, 'key.pem');
const sslCertPath = path.join(SSL_DIR, 'cert.pem');
const autoSSL = process.env.AUTO_SSL === 'true';

// Bereitet die Ordner vor
fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
fs.mkdirSync(SSL_DIR, { recursive: true });

module.exports = {
  PORT,
  HOST,
  DATA_DIR,
  UPLOAD_DIR,
  SSL_DIR,
  TASMOTA_FILE,
  RADIO_FILE,
  CAMERAS_FILE,
  APPOINTMENTS_FILE,
  CONFIG_FILE,
  FRITZ_FILE,
  CALLS_LOG_FILE,
  PRESENCE_FILE,
  sslKeyPath,
  sslCertPath,
  autoSSL
};
