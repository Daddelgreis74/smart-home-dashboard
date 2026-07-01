const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { UPLOAD_DIR } = require('../config/env');
const fileStore = require('../utils/fileStore');
const { cleanName } = require('../utils/validation');
const { pollPresence } = require('../services/fritzboxService');

const router = express.Router();

const avatarStorage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `avatar_${Date.now()}${ext}`);
  }
});

const avatarUpload = multer({
  storage: avatarStorage,
  limits: { fileSize: 3 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    const ok = /\.(jpg|jpeg|png|webp)$/i.test(file.originalname);
    cb(ok ? null : new Error('Nur Bilddateien (JPG, PNG, WEBP) sind erlaubt.'), ok);
  }
});

router.get('/', (req, res) => {
  res.json(fileStore.presenceRAM);
});

router.post('/upload', avatarUpload.single('avatarFile'), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, error: 'Keine Datei hochgeladen.' });
  res.json({ success: true, url: `/uploads/${req.file.filename}` });
});

router.post('/', (req, res) => {
  try {
    const { id, name, mac, image } = req.body;
    const cleanId = String(id || Date.now());
    const cleanN = cleanName(name, 'Person');
    const cleanM = String(mac || '').trim().toUpperCase();

    if (!/^([0-9A-F]{2}[:-]){5}([0-9A-F]{2})$/i.test(cleanM)) {
      return res.status(400).json({ success: false, error: 'Ungültiges MAC-Adressen-Format.' });
    }

    const presenceRAM = fileStore.presenceRAM;
    const index = presenceRAM.findIndex(p => p.id === cleanId);
    const existing = index >= 0 ? presenceRAM[index] : null;

    const person = {
      id: cleanId,
      name: cleanN,
      mac: cleanM,
      image: image || (existing ? existing.image : ''),
      active: existing ? existing.active : false,
      lastSeen: existing ? existing.lastSeen : '---'
    };

    if (index >= 0) {
      presenceRAM[index] = person;
    } else {
      presenceRAM.push(person);
    }

    fileStore.savePresence();
    res.json({ success: true, person });

    const io = req.app.get('io');
    if (io) {
      io.emit('presence-list-updated', presenceRAM);
    }
    
    // Trigger dynamic state update immediately
    pollPresence();
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const id = String(req.params.id);
    const presenceRAM = fileStore.presenceRAM;
    const index = presenceRAM.findIndex(p => p.id === id);
    if (index >= 0) {
      const person = presenceRAM[index];
      if (person.image && person.image.startsWith('/uploads/avatar_')) {
        const filePath = path.join(UPLOAD_DIR, path.basename(person.image));
        if (fs.existsSync(filePath)) {
          try { fs.unlinkSync(filePath); } catch (err) {}
        }
      }
      presenceRAM.splice(index, 1);
      fileStore.savePresence();
      res.json({ success: true });

      const io = req.app.get('io');
      if (io) {
        io.emit('presence-list-updated', presenceRAM);
      }
    } else {
      res.status(404).json({ success: false, error: 'Person nicht gefunden.' });
    }
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;
