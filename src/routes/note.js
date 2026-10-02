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

// Speichert oder aktualisiert die Notiz
router.post('/', (req, res) => {
  try {
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ success: false, error: 'Ungueltige Anfrage' });
    }

    const { image, lines, color, updatedAt } = req.body;
    
    // 1. image validieren: String, entweder '' oder data:image/(png|jpeg|jpg|webp);base64,... (max 4 Mio Zeichen)
    if (typeof image !== 'string') {
      return res.status(400).json({ success: false, error: 'Keine Bilddaten uebergeben' });
    }

    if (image.length > 4000000) {
      return res.status(400).json({ success: false, error: 'Bilddaten ueberschreiten die Maximallaenge von 4MB' });
    }

    if (image !== '' && !/^data:image\/(png|jpe?g|webp);base64,[A-Za-z0-9+/=]+$/.test(image)) {
      return res.status(400).json({ success: false, error: 'Ungueltiges Data-URL-Format fuer Bilddaten' });
    }

    // 2. color validieren: optional, aber wenn vorhanden muss es Hex-Code sein
    if (color !== undefined && color !== null && color !== '') {
      if (typeof color !== 'string' || !/^#[0-9a-fA-F]{3,8}$/.test(color)) {
        return res.status(400).json({ success: false, error: 'Ungueltiger Farbwert' });
      }
    }

    // 3. lines validieren: optional, aber wenn vorhanden muss es ein Array mit max 5000 Einträgen sein
    if (lines !== undefined && lines !== null) {
      if (!Array.isArray(lines) || lines.length > 5000) {
        return res.status(400).json({ success: false, error: 'Ungueltige Linien-Daten' });
      }
    }

    const validUpdatedAt = (typeof updatedAt === 'number' && Number.isFinite(updatedAt) && updatedAt > 0) 
      ? updatedAt 
      : Date.now();

    const payload = {
      image: image || '',
      lines: Array.isArray(lines) ? lines : [],
      color: color || '#fef08a', // Standard Post-it Gelb
      updatedAt: validUpdatedAt
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
