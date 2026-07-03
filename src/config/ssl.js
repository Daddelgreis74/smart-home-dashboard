const fs = require('fs');
const { execSync } = require('child_process');
const { sslKeyPath, sslCertPath, autoSSL, SSL_DIR } = require('./env');

function initializeSSL() {
  if (autoSSL && (!fs.existsSync(sslKeyPath) || !fs.existsSync(sslCertPath))) {
    console.log('AUTO_SSL ist aktiviert, aber Zertifikate fehlen. Generiere selbstsigniertes Zertifikat...');
    try {
      fs.mkdirSync(SSL_DIR, { recursive: true });
      execSync(`openssl req -x509 -newkey rsa:2048 -keyout "${sslKeyPath}" -out "${sslCertPath}" -sha256 -days 3650 -nodes -subj "/CN=SmartHome-Dashboard"`);
      console.log('Selbstsigniertes Zertifikat erfolgreich generiert.');
    } catch (err) {
      console.error('Fehler bei der automatischen Generierung des SSL-Zertifikats:', err.message);
    }

    // Fail-fast
    if (!fs.existsSync(sslKeyPath) || !fs.existsSync(sslCertPath)) {
      console.error('CRITICAL ERROR: AUTO_SSL=true konfiguriert, aber die SSL-Zertifikatsdateien (key.pem/cert.pem) konnten weder gefunden noch generiert werden.');
      process.exit(1);
    }
  }

  const useSSL = fs.existsSync(sslKeyPath) && fs.existsSync(sslCertPath);
  let sslOptions = null;
  if (useSSL) {
    sslOptions = {
      key: fs.readFileSync(sslKeyPath),
      cert: fs.readFileSync(sslCertPath)
    };
  }

  return { useSSL, sslOptions };
}

module.exports = {
  initializeSSL
};
