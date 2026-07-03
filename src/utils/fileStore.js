const fs = require('fs');

function safeWriteFileSync(filePath, data, options) {
  try {
    fs.writeFileSync(filePath, data, options);
  } catch (err) {
    if (err.code === 'EACCES') {
      console.warn(`[FileStore Warning] Permission denied (EACCES) writing to ${filePath}. Attempting POSIX-unlink recovery...`);
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
        fs.writeFileSync(filePath, data, options);
        console.log(`[FileStore Recovery] POSIX-unlink recovery succeeded! File ${filePath} is now owned by the current process user.`);
      } catch (recoveryErr) {
        console.error(`[FileStore Error] POSIX-unlink recovery failed for ${filePath}:`, recoveryErr.message);
        throw err;
      }
    } else {
      throw err;
    }
  }
}
const { 
  TASMOTA_FILE, 
  FRITZ_FILE, 
  CALLS_LOG_FILE, 
  PRESENCE_FILE, 
  CAMERAS_FILE, 
  APPOINTMENTS_FILE 
} = require('../config/env');
const { 
  sanitizeTasmotaList, 
  sanitizeCameras, 
  sanitizeAppointments 
} = require('./validation');

// RAM Caches
let tasmotaRAM = [];
let fritzConfig = {};
let fritzCalls = [];
let activeCalls = {};
let presenceRAM = [];
let camerasRAM = [];
let appointmentsRAM = [];

// Init functions
function getTasmota() {
  if (fs.existsSync(TASMOTA_FILE)) {
    try {
      tasmotaRAM = sanitizeTasmotaList(JSON.parse(fs.readFileSync(TASMOTA_FILE, 'utf8')));
    } catch(e) { console.error("Parse Error Tasmota File", e); }
  }
  return tasmotaRAM;
}

function saveTasmota(data) {
  tasmotaRAM = sanitizeTasmotaList(data);
  try {
    safeWriteFileSync(TASMOTA_FILE, JSON.stringify(tasmotaRAM, null, 2));
  } catch(e) {
    console.error("Schreibfehler Tasmota File", e);
  }
  return tasmotaRAM;
}

function loadFritzConfig() {
  if (fs.existsSync(FRITZ_FILE)) {
    try {
      fritzConfig = JSON.parse(fs.readFileSync(FRITZ_FILE, 'utf8'));
    } catch(e) { console.error("Parse Error Fritz File", e); }
  }
  return fritzConfig;
}

function saveFritzConfig(cfg) {
  fritzConfig = {
    ip: String(cfg?.ip || '').trim(),
    user: String(cfg?.user || '').trim(),
    pass: String(cfg?.pass || '').trim()
  };
  try {
    safeWriteFileSync(FRITZ_FILE, JSON.stringify(fritzConfig, null, 2));
  } catch(e) {
    console.error("Schreibfehler Fritz File", e);
  }
  return fritzConfig;
}

function loadCallLog() {
  if (fs.existsSync(CALLS_LOG_FILE)) {
    try {
      fritzCalls = JSON.parse(fs.readFileSync(CALLS_LOG_FILE, 'utf8'));
      if (!Array.isArray(fritzCalls)) fritzCalls = [];
    } catch(e) { console.error("Parse Error CallLog File", e); fritzCalls = []; }
  }
  return fritzCalls;
}

function saveCallLog() {
  try {
    safeWriteFileSync(CALLS_LOG_FILE, JSON.stringify(fritzCalls, null, 2));
  } catch(e) {
    console.error("Schreibfehler CallLog File", e);
  }
}

function loadPresence() {
  if (fs.existsSync(PRESENCE_FILE)) {
    try {
      presenceRAM = JSON.parse(fs.readFileSync(PRESENCE_FILE, 'utf8'));
      if (!Array.isArray(presenceRAM)) presenceRAM = [];
    } catch(e) { console.error("Parse Error Presence File", e); presenceRAM = []; }
  }
  return presenceRAM;
}

function savePresence() {
  try {
    safeWriteFileSync(PRESENCE_FILE, JSON.stringify(presenceRAM, null, 2));
  } catch(e) {
    console.error("Schreibfehler Presence File", e);
  }
}

function loadCameras() {
  if (fs.existsSync(CAMERAS_FILE)) {
    try {
      camerasRAM = sanitizeCameras(JSON.parse(fs.readFileSync(CAMERAS_FILE, 'utf8')));
    } catch(e) { console.error("Parse Error Cameras File", e); }
  }
  return camerasRAM;
}

function saveCameras(data) {
  camerasRAM = sanitizeCameras(data);
  try {
    safeWriteFileSync(CAMERAS_FILE, JSON.stringify(camerasRAM, null, 2));
  } catch(e) {
    console.error("Schreibfehler Cameras File", e);
  }
  return camerasRAM;
}

function loadAppointments() {
  if (fs.existsSync(APPOINTMENTS_FILE)) {
    try {
      appointmentsRAM = sanitizeAppointments(JSON.parse(fs.readFileSync(APPOINTMENTS_FILE, 'utf8')));
    } catch(e) { console.error("Parse Error Appointments File", e); }
  }
  return appointmentsRAM;
}

function saveAppointments(data) {
  appointmentsRAM = sanitizeAppointments(data);
  try {
    safeWriteFileSync(APPOINTMENTS_FILE, JSON.stringify(appointmentsRAM, null, 2));
  } catch(e) {
    console.error("Schreibfehler Appointments File", e);
  }
  return appointmentsRAM;
}

// Initialisiere alle Speicher einmal beim Laden des Moduls
getTasmota();
loadFritzConfig();
loadCallLog();
loadPresence();
loadCameras();
loadAppointments();

module.exports = {
  // Direkt veränderbare RAM-Referenzen per Getter/Setter
  get tasmotaRAM() { return tasmotaRAM; },
  set tasmotaRAM(val) { tasmotaRAM = val; },

  get fritzConfig() { return fritzConfig; },
  set fritzConfig(val) { fritzConfig = val; },

  get fritzCalls() { return fritzCalls; },
  set fritzCalls(val) { fritzCalls = val; },

  get activeCalls() { return activeCalls; },
  set activeCalls(val) { activeCalls = val; },

  get presenceRAM() { return presenceRAM; },
  set presenceRAM(val) { presenceRAM = val; },

  get camerasRAM() { return camerasRAM; },
  set camerasRAM(val) { camerasRAM = val; },

  get appointmentsRAM() { return appointmentsRAM; },
  set appointmentsRAM(val) { appointmentsRAM = val; },

  // Lese-/Schreibmethoden
  safeWriteFileSync,
  getTasmota,
  saveTasmota,
  loadFritzConfig,
  saveFritzConfig,
  loadCallLog,
  saveCallLog,
  loadPresence,
  savePresence,
  loadCameras,
  saveCameras,
  loadAppointments,
  saveAppointments
};
