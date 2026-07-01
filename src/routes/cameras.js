const express = require('express');
const fileStore = require('../utils/fileStore');
const { cleanName } = require('../utils/validation');

const router = express.Router();

router.get('/', (req, res) => {
  res.json(fileStore.camerasRAM);
});

router.post('/', (req, res) => {
  try {
    const { id, name, url, interval } = req.body;
    const cleanId = String(id || Date.now());
    const cleanN = cleanName(name, 'Kamera');
    const cleanU = String(url || '').trim().slice(0, 800);
    if (!/^https?:\/\//i.test(cleanU)) {
      return res.status(400).json({ success: false, error: 'Ungültige Kamera-URL. Muss mit http:// oder https:// beginnen.' });
    }
    const cleanI = Math.max(0, Number(interval || 0));

    const camerasRAM = fileStore.camerasRAM;
    const index = camerasRAM.findIndex(c => c.id === cleanId);

    const camera = {
      id: cleanId,
      name: cleanN,
      url: cleanU,
      interval: cleanI
    };

    if (index >= 0) {
      camerasRAM[index] = camera;
    } else {
      camerasRAM.push(camera);
    }

    fileStore.saveCameras(camerasRAM);
    res.json({ success: true, camera });

    const io = req.app.get('io');
    if (io) {
      io.emit('cameras-updated', camerasRAM);
    }
  } catch(e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const id = String(req.params.id);
    const camerasRAM = fileStore.camerasRAM;
    const index = camerasRAM.findIndex(c => c.id === id);
    if (index >= 0) {
      camerasRAM.splice(index, 1);
      fileStore.saveCameras(camerasRAM);
      res.json({ success: true });

      const io = req.app.get('io');
      if (io) {
        io.emit('cameras-updated', camerasRAM);
      }
    } else {
      res.status(404).json({ success: false, error: 'Kamera nicht gefunden.' });
    }
  } catch(e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;
