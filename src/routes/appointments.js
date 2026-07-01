const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { UPLOAD_DIR } = require('../config/env');
const fileStore = require('../utils/fileStore');
const { cleanName } = require('../utils/validation');

const router = express.Router();

const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (req, file, cb) => cb(null, 'calendar.ics')
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    const ok = file.originalname.toLowerCase().endsWith('.ics') || file.mimetype === 'text/calendar';
    cb(ok ? null : new Error('Nur .ics-Dateien sind erlaubt.'), ok);
  }
});

router.get('/', (req, res) => {
  res.json(fileStore.appointmentsRAM);
});

router.post('/', (req, res) => {
  try {
    const { id, title, date, time, description } = req.body;
    const cleanId = String(id || Date.now());
    const cleanT = cleanName(title, 'Termin');
    const cleanD = String(date || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(cleanD)) {
      return res.status(400).json({ success: false, error: 'Ungültiges Datumsformat. YYYY-MM-DD erforderlich.' });
    }
    let cleanTime = String(time || '').trim();
    if (cleanTime && !/^\d{2}:\d{2}$/.test(cleanTime)) {
      cleanTime = '00:00';
    } else if (!cleanTime) {
      cleanTime = '00:00';
    }
    const cleanDesc = String(description || '').replace(/[\r\n\t]/g, ' ').trim().slice(0, 500);

    const appointmentsRAM = fileStore.appointmentsRAM;
    const index = appointmentsRAM.findIndex(a => a.id === cleanId);
    const appt = {
      id: cleanId,
      title: cleanT,
      date: cleanD,
      time: cleanTime,
      description: cleanDesc
    };

    if (index >= 0) {
      appointmentsRAM[index] = appt;
    } else {
      appointmentsRAM.push(appt);
    }

    // Nach Datum und Uhrzeit sortieren
    appointmentsRAM.sort((a, b) => {
      const dateTimeA = new Date(`${a.date}T${a.time}`);
      const dateTimeB = new Date(`${b.date}T${b.time}`);
      return dateTimeA - dateTimeB;
    });

    fileStore.saveAppointments(appointmentsRAM);
    res.json({ success: true, appointment: appt });

    const io = req.app.get('io');
    if (io) {
      io.emit('appointments-updated', appointmentsRAM);
    }
  } catch(e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const id = String(req.params.id);
    const appointmentsRAM = fileStore.appointmentsRAM;
    const index = appointmentsRAM.findIndex(a => a.id === id);
    if (index >= 0) {
      appointmentsRAM.splice(index, 1);
      fileStore.saveAppointments(appointmentsRAM);
      res.json({ success: true });

      const io = req.app.get('io');
      if (io) {
        io.emit('appointments-updated', appointmentsRAM);
      }
    } else {
      res.status(404).json({ success: false, error: 'Termin nicht gefunden.' });
    }
  } catch(e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post('/upload-ics', (req, res) => {
  upload.single('icsFile')(req, res, (err) => {
    if (err) return res.status(400).json({ success: false, error: err.message });
    if (!req.file) return res.status(400).json({ success: false, error: 'Keine Datei.' });
    res.json({ success: true });
  });
});

router.get('/ics-data', (req, res) => {
  const icsPath = path.join(UPLOAD_DIR, 'calendar.ics');
  if (fs.existsSync(icsPath)) {
    res.json({ success: true, data: fs.readFileSync(icsPath, 'utf-8') });
  } else {
    res.json({ success: false });
  }
});

module.exports = router;
