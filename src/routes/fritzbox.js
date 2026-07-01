const express = require('express');
const fileStore = require('../utils/fileStore');
const { initFritzboxConnections, soapCall } = require('../services/fritzboxService');

const router = express.Router();

router.get('/config', (req, res) => {
  const fritzConfig = fileStore.fritzConfig;
  res.json({
    success: true,
    ip: fritzConfig.ip,
    user: fritzConfig.user,
    callMonitorEnabled: fritzConfig.callMonitorEnabled
  });
});

router.post('/config', (req, res) => {
  try {
    fileStore.saveFritzConfig(req.body);
    const io = req.app.get('io');
    initFritzboxConnections(io);
    res.json({ success: true });
  } catch(e) {
    res.json({ success: false, error: e.message });
  }
});

router.get('/radio', async (req, res) => {
  const fritzConfig = fileStore.fritzConfig;
  if (!fritzConfig.ip) {
    return res.json({ success: false, error: 'Keine Fritz!Box IP konfiguriert' });
  }

  try {
    const service = 'urn:schemas-upnp-org:service:ContentDirectory:1';
    const action = 'Browse';
    const soapPath = '/MediaServer/ContentDirectory/Control';
    
    // Schritt 1: Browse Internetradio Ordner (holt alle Sender-Ordner)
    const folderRes = await soapCall(fritzConfig.ip, soapPath, service, action, {
      ObjectID: '4:cont2:150:0:0:',
      BrowseFlag: 'BrowseDirectChildren',
      Filter: '*',
      StartingIndex: 0,
      RequestedCount: 100,
      SortCriteria: ''
    });

    if (folderRes.status !== 200 || !folderRes.body) {
      return res.json({ success: true, stations: [] });
    }

    const match = folderRes.body.match(/<Result>([\s\S]+?)<\/Result>/);
    if (!match) {
      return res.json({ success: true, stations: [] });
    }

    const xml = match[1]
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"');

    const stationFolders = [];
    const containerRegex = /<container\s+id="([^"]+)"[^>]*>([\s\S]+?)<\/container>/g;
    let m;
    while ((m = containerRegex.exec(xml)) !== null) {
      const id = m[1];
      const inner = m[2];
      const titleM = inner.match(/<dc:title>([^<]+)<\/dc:title>/);
      const title = titleM ? titleM[1] : 'Unbekannter Sender';
      stationFolders.push({ id, name: title });
    }

    // Schritt 2: Jeden Sender-Ordner abfragen, um den tatsächlichen Stream-Track auszulesen
    const stations = [];
    for (const folder of stationFolders) {
      const itemRes = await soapCall(fritzConfig.ip, soapPath, service, action, {
        ObjectID: folder.id,
        BrowseFlag: 'BrowseDirectChildren',
        Filter: '*',
        StartingIndex: 0,
        RequestedCount: 100,
        SortCriteria: ''
      });

      if (itemRes.status === 200 && itemRes.body) {
        const fMatch = itemRes.body.match(/<Result>([\s\S]+?)<\/Result>/);
        if (fMatch) {
          const fXml = fMatch[1]
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"');

          const itemRegex = /<item\s+id="([^"]+)"[^>]*>([\s\S]+?)<\/item>/;
          const itemMatch = fXml.match(itemRegex);
          if (itemMatch) {
            const itemInner = itemMatch[0];
            const resMatch = itemInner.match(/<res[^>]*>([^<]+)<\/res>/);
            const url = resMatch ? resMatch[1] : '';
            if (url) {
              stations.push({ name: folder.name, url: url });
            }
          }
        }
      }
    }

    res.json({ success: true, stations });
  } catch (e) {
    console.error('[Fritzbox Radio] Fehler beim Laden:', e);
    res.json({ success: false, error: e.message });
  }
});

module.exports = router;
