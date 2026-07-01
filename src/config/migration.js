const path = require('path');
const fs = require('fs');
const { DATA_DIR } = require('./env');

function runMigration() {
  const projectRoot = path.join(__dirname, '..', '..');

  // Automatische Migration alter Dateien aus dem Wurzelverzeichnis in den data/ Ordner
  const legacyFiles = [
    'tasmota.json',
    'radio.json',
    'cameras.json',
    'appointments.json',
    'config.json',
    'fritzbox.json',
    'fritzbox_calls.json',
    'presence.json'
  ];

  legacyFiles.forEach(file => {
    const oldPath = path.join(projectRoot, file);
    const newPath = path.join(DATA_DIR, file);
    if (fs.existsSync(oldPath) && !fs.existsSync(newPath)) {
      try {
        fs.renameSync(oldPath, newPath);
        console.log(`Migrierte alte Konfigurationsdatei: ${file} -> data/${file}`);
      } catch (err) {
        console.error(`Fehler bei der Migration von ${file}:`, err.message);
      }
    }
  });

  // Automatische Migration des alten uploads/ Ordners
  const oldUploadsDir = path.join(projectRoot, 'uploads');
  const newUploadsDir = path.join(DATA_DIR, 'uploads');
  if (fs.existsSync(oldUploadsDir) && oldUploadsDir !== newUploadsDir) {
    try {
      if (!fs.existsSync(newUploadsDir)) {
        fs.renameSync(oldUploadsDir, newUploadsDir);
        console.log("Migrierte alten 'uploads/' Ordner erfolgreich nach 'data/uploads/'");
      } else {
        const files = fs.readdirSync(oldUploadsDir);
        files.forEach(file => {
          const oldFile = path.join(oldUploadsDir, file);
          const newFile = path.join(newUploadsDir, file);
          if (!fs.existsSync(newFile)) {
            fs.renameSync(oldFile, newFile);
          }
        });
        console.log("Inhalte des alten 'uploads/' Ordners wurden nach 'data/uploads/' zusammengeführt.");
      }
    } catch (err) {
      console.error("Fehler bei der Migration des 'uploads/' Ordners:", err.message);
    }
  }

  // Automatische Migration des alten ssl/ Ordners
  const oldSslDir = path.join(projectRoot, 'ssl');
  const newSslDir = path.join(DATA_DIR, 'ssl');
  if (fs.existsSync(oldSslDir) && oldSslDir !== newSslDir) {
    try {
      if (!fs.existsSync(newSslDir)) {
        fs.renameSync(oldSslDir, newSslDir);
        console.log("Migrierte alten 'ssl/' Ordner erfolgreich nach 'data/ssl/'");
      } else {
        const files = fs.readdirSync(oldSslDir);
        files.forEach(file => {
          const oldFile = path.join(oldSslDir, file);
          const newFile = path.join(newSslDir, file);
          if (!fs.existsSync(newFile)) {
            fs.renameSync(oldFile, newFile);
          }
        });
        console.log("Inhalte des alten 'ssl/' Ordners wurden nach 'data/ssl/' zusammengeführt.");
      }
    } catch (err) {
      console.error("Fehler bei der Migration des 'ssl/' Ordners:", err.message);
    }
  }
}

module.exports = {
  runMigration
};
