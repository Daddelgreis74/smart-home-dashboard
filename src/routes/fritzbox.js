const express = require('express');
const fileStore = require('../utils/fileStore');
const { 
  initFritzboxConnections, 
  soapCall,
  getFritzExtraData,
  getGuestWifi,
  setGuestWifi,
  refreshPhonebook
} = require('../services/fritzboxService');

const router = express.Router();

router.get('/status', (req, res) => {
  try {
    const data = getFritzExtraData();
    res.json({ success: true, ...data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/guest-wifi', (req, res) => {
  try {
    const gw = getGuestWifi();
    res.json({
      success: true,
      enabled: gw.enabled,
      ssid: gw.ssid,
      key: gw.key,
      status: gw.status
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/guest-wifi/qr', (req, res) => {
  try {
    const gw = getGuestWifi();
    if (!gw.ssid) {
      return res.status(400).json({ success: false, error: 'Keine Gast-WLAN SSID konfiguriert' });
    }
    const QRCode = require('qrcode-svg');
    const wifiString = `WIFI:T:WPA;S:${gw.ssid};P:${gw.key || ''};;`;
    const qrcode = new QRCode({
      content: wifiString,
      padding: 2,
      width: 256,
      height: 256,
      color: '#0f172a',
      background: '#ffffff',
      ecl: 'M',
      container: 'svg-viewbox',
      join: true
    });
    res.json({
      success: true,
      svg: qrcode.svg(),
      ssid: gw.ssid,
      key: gw.key,
      enabled: gw.enabled
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/guest-wifi', async (req, res) => {
  try {
    const { enabled } = req.body || {};
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ success: false, error: 'Parameter "enabled" muss ein Boolean sein' });
    }
    const result = await setGuestWifi(enabled);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/phonebook/reload', async (req, res) => {
  try {
    await refreshPhonebook();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

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

router.post('/test', (req, res) => {
  const ip = String(req.body?.ip || '').trim();
  const { isPrivateIPv4 } = require('../utils/validation');
  if (!isPrivateIPv4(ip)) {
    return res.status(400).json({ success: false, error: 'Ungültige lokale IPv4-Adresse' });
  }

  const net = require('net');
  const client = new net.Socket();
  client.setTimeout(3000);

  client.connect(49000, ip, () => {
    client.destroy();
    res.json({ success: true });
  });

  client.on('error', (err) => {
    client.destroy();
    res.json({ success: false, error: `Verbindung fehlgeschlagen: ${err.message}` });
  });

  client.on('timeout', () => {
    client.destroy();
    res.json({ success: false, error: 'Verbindungstimeout (Port 49000 antwortet nicht)' });
  });
});

module.exports = router;
