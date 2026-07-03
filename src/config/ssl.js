const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');
const { sslKeyPath, sslCertPath, autoSSL, SSL_DIR } = require('./env');

function initializeSSL() {
  let targetSslDir = SSL_DIR;
  let targetKeyPath = sslKeyPath;
  let targetCertPath = sslCertPath;

  // Prüfen, ob wir in das konfigurierte SSL-Verzeichnis schreiben können.
  // Falls nicht (z. B. wegen EACCES/Permission Denied auf TrueNAS), weichen wir auf /tmp/ssl/ aus.
  let canWrite = true;
  try {
    fs.mkdirSync(targetSslDir, { recursive: true });
    const testFile = path.join(targetSslDir, '.write-test-ssl');
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
  } catch (e) {
    canWrite = false;
  }

  // Auch prüfen, ob eventuell bereits existierende Zertifikatsdateien lesbar sind
  let canReadExisting = true;
  if (fs.existsSync(targetKeyPath) && fs.existsSync(targetCertPath)) {
    try {
      fs.accessSync(targetKeyPath, fs.constants.R_OK);
      fs.accessSync(targetCertPath, fs.constants.R_OK);
    } catch (e) {
      canReadExisting = false;
    }
  }

  if (!canWrite || !canReadExisting) {
    console.warn(`[SSL] Konfiguriertes Verzeichnis ${targetSslDir} ist nicht schreib- oder lesbar (EACCES). Weiche auf temporären Speicher /tmp/ssl/ aus.`);
    targetSslDir = '/tmp/ssl';
    targetKeyPath = '/tmp/ssl/key.pem';
    targetCertPath = '/tmp/ssl/cert.pem';
    try {
      fs.mkdirSync(targetSslDir, { recursive: true });
    } catch (err) {
      console.error('[SSL CRITICAL] Kann auch /tmp/ssl nicht erstellen:', err.message);
    }
  }

  if (autoSSL && (!fs.existsSync(targetKeyPath) || !fs.existsSync(targetCertPath))) {
    console.log('AUTO_SSL ist aktiviert, aber Zertifikate fehlen. Generiere selbstsigniertes Zertifikat...');
    try {
      execSync(`openssl req -x509 -newkey rsa:2048 -keyout "${targetKeyPath}" -out "${targetCertPath}" -sha256 -days 3650 -nodes -subj "/CN=SmartHome-Dashboard"`);
      console.log('Selbstsigniertes Zertifikat erfolgreich generiert.');
    } catch (err) {
      console.error('Fehler bei der automatischen Generierung des SSL-Zertifikats:', err.message);
    }

    // Fail-fast
    if (!fs.existsSync(targetKeyPath) || !fs.existsSync(targetCertPath)) {
      console.error('CRITICAL ERROR: AUTO_SSL=true konfiguriert, aber die SSL-Zertifikatsdateien (key.pem/cert.pem) konnten weder gefunden noch generiert werden.');
      process.exit(1);
    }
  }

  const useSSL = fs.existsSync(targetKeyPath) && fs.existsSync(targetCertPath);
  let sslOptions = null;
  if (useSSL) {
    try {
      sslOptions = {
        key: fs.readFileSync(targetKeyPath),
        cert: fs.readFileSync(targetCertPath)
      };
    } catch (err) {
      console.error('[SSL CRITICAL] Fehler beim Lesen der Zertifikatsdateien:', err.message);
      process.exit(1);
    }
  }

  return { useSSL, sslOptions };
}

module.exports = {
  initializeSSL
};
