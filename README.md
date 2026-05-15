# Smart Home Dashboard v3 · Neo Deck 🏠👻

![Dashboard Vorschau](preview.png)

Ein modernes Smart-Home-Wandpanel für ein **Lenovo Tab M10 FHD Plus (10.3", 1920×1200, 16:10)** im Querformat. Optimiert für den dauerhaften Betrieb im **Fully Kiosk Browser**.

## ✨ Highlights

- **Neo Aurora Command Deck:** dunkles, hochwertiges Wall-Panel-Design mit Aurora-Glow, Glas-/Metal-Karten und adaptivem 2-Reihen-Layout.
- **Adaptive Widgets:** Layout passt sich besser an Seitenverhältnis und Fully-Kiosk-Viewport an, statt unten Inhalte abzuschneiden.
- **Wetter Pro:** Open-Meteo Daten mit Temperatur, Gefühlter Temperatur, Min/Max, Luftfeuchte, Regenwahrscheinlichkeit, Wind, Luftdruck, Wolken und UV-Index.
- **Smart Home / Tasmota:** lokale Geräteverwaltung, Scan im privaten Heimnetz, Toggle-Buttons mit Statusanzeige und Offline-Dimmung.
- **Abfallkalender:** `.ics` Upload, kommende Leerungen und farbige Mülltonnen-Icons für Bio, Papier, Gelb/Plastik und Restmüll.
- **Live Radio:** Preset-Tasten im Dashboard, Senderverwaltung in den Präferenzen, HLS/MP3/AAC-Unterstützung und Schutz gegen ungewollten Autostart beim Tablet-Wakeup.
- **Neo Talk:** Mikrofon-Widget für Speech-to-Text im Browser, Antwort über lokale OpenClaw-Anbindung und Text-to-Speech auf dem Tablet.
- **System Status:** Live CPU/RAM/Temperatur/Netzwerk per Socket.IO.
- **Touch-ready:** Drag & Drop via Sortable.js mit Fully-Kiosk-kompatibler Verzögerung.

## 🧭 Bedienung

### Präferenzen
Über das Menü oben rechts lassen sich konfigurieren:

- sichtbare Widgets
- Tasmota-Geräte und Subnetz-Scan
- Abfallkalender-Upload
- Wetterstandort
- Radio-Sender und Preset-Tasten
- Neo-Talk-Sprachausgabe

### Radio-Autoplay-Schutz
Das Radio startet **nur** noch durch expliziten Klick auf:

- Play-Button
- Preset-Taste

Beim Schlafen/Aufwecken des Tablets wird ein aktiver Stream hart gestoppt und das Audio-Element entfernt, damit Fully Kiosk/Android keinen Stream selbstständig wiederbelebt.

## 🛠️ Architektur

- **Backend:** Node.js, Express.js
- **Realtime:** Socket.IO
- **Systemdaten:** `systeminformation`
- **Uploads:** `multer`
- **Frontend:** Vanilla JS, CSS Grid, Sortable.js, HLS.js
- **Wetter:** Open-Meteo API, ohne API-Key
- **Port:** `8443`
- **HTTPS:** lokales Zertifikat unter `ssl/`

## 🔐 Sicherheit & lokale Dateien

Nicht committen:

- `ssl/`
- `radio.json`
- `tasmota.json`
- `uploads/`
- `node_modules/`

Die `.gitignore` ist entsprechend vorbereitet.

Backend-Härtungen:

- JSON Body-Limit
- `.ics` Upload-Limit und Dateifilter
- Tasmota Toggle/Scan nur für private IPv4-Netze
- Radio-URLs werden validiert/normalisiert

## 🚀 Betrieb

```bash
npm install
npm start
```

Standardmäßig läuft der Server auf:

```text
https://0.0.0.0:8443
```

Optional per Environment überschreibbar:

```bash
PORT=8443 HOST=0.0.0.0 npm start
```

### Neo Talk aktivieren

Das Voice-Widget ist im Code generisch und enthält keine privaten URLs, Tunnel oder Tokens. Die lokale OpenClaw-Anbindung wird bewusst nur per Environment aktiviert:

```bash
OPENCLAW_VOICE_TALK=1 npm start
```

Optionale Variablen:

```bash
OPENCLAW_VOICE_SESSION=smart-home-dashboard-voice
OPENCLAW_VOICE_TIMEOUT_MS=120000
OPENCLAW_CLI=/root/.npm-global/bin/openclaw
```

## 🧪 Checks

```bash
node --check server.js
node --check public/app.js
npm audit --omit=dev
```

## 📁 Projektpfad

```text
/root/.openclaw/workspace/smart-home-dashboard
```

---

Mit 👻 entwickelt von **Neo**, dem digitalen Hausgeist.
