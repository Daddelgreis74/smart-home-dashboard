const express = require('express');
const fs = require('fs');
const { NOTE_FILE } = require('../config/env');
const { safeWriteFileSync } = require('../utils/fileStore');

const router = express.Router();

// Liefert die aktuelle Notiz
router.get('/', (req, res) => {
  try {
    if (fs.existsSync(NOTE_FILE)) {
      const data = JSON.parse(fs.readFileSync(NOTE_FILE, 'utf8'));
      return res.json({ success: true, note: data });
    }
    return res.json({ success: true, note: null });
  } catch (err) {
    console.error('[Note API] Fehler beim Lesen der Notiz:', err.message);
    return res.status(500).json({ success: false, error: 'Notiz konnte nicht geladen werden' });
  }
});

// Pen-Diagnose-Endpunkt für Kiosk-Tablet
router.post('/debug-pen', (req, res) => {
  console.log('[PEN DEBUG FROM TABLET]:', JSON.stringify(req.body));
  return res.json({ ok: true });
});

// Speichert oder aktualisiert die Notiz
router.post('/', (req, res) => {
  try {
    const { image, lines, color, updatedAt } = req.body;
    
    // image ist die Base64-Data-URL des gezeichneten Canvas
    if (!image && image !== '') {
      return res.status(400).json({ success: false, error: 'Keine Bilddaten uebergeben' });
    }

    const payload = {
      image: image || '',
      lines: Array.isArray(lines) ? lines : [],
      color: color || '#fef08a', // Standard Post-it Gelb
      updatedAt: updatedAt || Date.now()
    };

    safeWriteFileSync(NOTE_FILE, JSON.stringify(payload, null, 2), 'utf8');

    // Broadcast an alle Clients via Socket.io
    const io = req.app.get('io');
    if (io) {
      io.emit('note-updated', payload);
    }

    return res.json({ success: true, note: payload });
  } catch (err) {
    console.error('[Note API] Fehler beim Speichern der Notiz:', err.message);
    return res.status(500).json({ success: false, error: 'Notiz konnte nicht gespeichert werden' });
  }
});

// Leert die Notiz
router.delete('/', (req, res) => {
  try {
    const emptyPayload = {
      image: '',
      lines: [],
      color: '#fef08a',
      updatedAt: Date.now()
    };

    safeWriteFileSync(NOTE_FILE, JSON.stringify(emptyPayload, null, 2), 'utf8');

    const io = req.app.get('io');
    if (io) {
      io.emit('note-cleared');
      io.emit('note-updated', emptyPayload);
    }

    return res.json({ success: true });
  } catch (err) {
    console.error('[Note API] Fehler beim Loeschen der Notiz:', err.message);
    return res.status(500).json({ success: false, error: 'Notiz konnte nicht geloescht werden' });
  }
});

module.exports = router;
