# Smart Home Dashboard v3 · Neo Deck 🏠👻

![Dashboard Vorschau](preview.png)

Ein modernes Smart-Home-Wandpanel für ein **Lenovo Tab M10 FHD Plus (10.3", 1920×1200, 16:10)** im Querformat. Optimiert für den dauerhaften Betrieb im **Fully Kiosk Browser**.

### 🎨 Dashboard Themes (Vorschau)
Das Dashboard unterstützt vier komplett unterschiedliche, umschaltbare Design-Stile:

*   **Neo-Aurora (Standard):** Transparente Frosted-Glass-Karten mit weichen Auras und leuchtenden Widgets.
    ![Neo-Aurora](public/themes/neo_aurora.png)
*   **Cyberpunk HUD:** Taktischer High-Tech-Look in Orange/Amber mit scharfen Ecken und Gitternetz-Hintergrund.
    ![Cyberpunk HUD](public/themes/cyberpunk_hud.png)
*   **Cozy Nordic Dark:** Beruhigende, organische Ästhetik mit salbeigrünen Akzenten und weichen Schatten.
    ![Cozy Nordic Dark](public/themes/nordic_dark.png)
*   **Retrowave Laser Synth:** Nostalgischer 80er-Retro-Look in Pink/Cyan mit perspektivischer Laser-Bodenlinie.
    ![Retrowave Laser Synth](public/themes/retrowave_synth.png)

## ✨ Highlights

- **Multi-Theme-System:** 4 edle, frei umschaltbare Premium-Designs (Neo-Aurora Glassmorphism, Cyberpunk Tactical HUD, Cozy Nordic Dark, Retrowave Laser Synth) mit persistentem Speicher im Browser.
- **Neo Aurora Command Deck:** dunkles, hochwertiges Wall-Panel-Design mit Aurora-Glow, Glas-/Metal-Karten und adaptivem 2-Reihen-Layout.
- **Adaptive Widgets:** Layout passt sich besser an Seitenverhältnis und Fully-Kiosk-Viewport an, statt unten Inhalte abzuschneiden.
- **Wetter Pro:** Open-Meteo Daten mit Temperatur, Gefühlter Temperatur, Min/Max, Luftfeuchte, Regenwahrscheinlichkeit, Wind, Luftdruck, Wolken und UV-Index.
- **Smart Home / Tasmota:** lokale Geräteverwaltung, Scan im privaten Heimnetz, Toggle-Buttons mit Statusanzeige und Offline-Dimmung.
- **AM2301 Klima-Sensor:** eigenes Tasmota-Sensor-Widget mit Temperatur-/Feuchte-Gauges, Taupunkt und konfigurierbarer lokaler IP.
- **Abfallkalender:** `.ics` Upload, kommende Leerungen, farbige Mülltonnen-Icons und kalendertagsgenaue Heute/Morgen-Anzeige ohne Uhrzeit-Versatz.
- **Live Radio:** Preset-Tasten im Dashboard, Senderverwaltung in den Präferenzen, HLS/MP3/AAC-Unterstützung und Schutz gegen ungewollten Autostart beim Tablet-Wakeup.
- **Neo Talk:** Mikrofon-Widget für Speech-to-Text im Browser, Antwort über lokale OpenClaw-Anbindung und Text-to-Speech auf dem Tablet.
- **System Status:** Live CPU/RAM/Temperatur/Netzwerk per Socket.IO.
- **Fritz!Box Monitor:** Live Netzwerk- & Internet-Status (LEDs/Latenz in ms) sowie ein Echtzeit-Anruf-Monitor (Port 1012) mit bildschirmfüllendem Live-Anrufer-Overlay (Toast) und historischer Anrufliste.
- **Touch-ready:** Drag & Drop via Sortable.js mit Fully-Kiosk-kompatibler Verzögerung.

## 🧭 Bedienung

### Präferenzen
Über das Menü oben rechts lassen sich konfigurieren:

- Multi-Theme
- sichtbare Widgets
- Tasmota-Geräte und Subnetz-Scan
- AM2301/Tasmota-Klima-Sensor-IP
- Abfallkalender-Upload
- Wetterstandort
- Radio-Sender und Preset-Tasten
- Neo-Talk-Sprachausgabe
- Fritz!Box-Verbindungsdaten und Call-Monitor

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
- **HTTPS & HTTP-Fallback:** Läuft standardmäßig auf HTTPS mit Zertifikat unter `ssl/`. Bietet einen automatischen, sicheren Fallback auf Standard-HTTP, falls keine SSL-Zertifikate vorhanden sind (ideal für lokale Windows-Testserver).

## 🔐 Sicherheit & lokale Dateien

Nicht committen:

- `ssl/`
- `radio.json`
- `tasmota.json`
- `uploads/`
- `node_modules/`
- `fritzbox.json`
- `fritzbox_calls.json`

Die `.gitignore` ist entsprechend vorbereitet.

Backend-Härtungen:

- JSON Body-Limit
- `.ics` Upload-Limit und Dateifilter
- Tasmota Toggle/Scan/Sensor-Abfrage nur für private IPv4-Netze
- Radio-URLs werden validiert/normalisiert

## 🗓️ Abfallkalender-Datumslogik

Ganztägige `.ics` Termine werden als lokale Kalendertage verglichen. Dadurch wird z.B. eine morgige Leerung morgens nicht mehr fälschlich als „Heute“ angezeigt, nur weil die aktuelle Uhrzeit bereits nach `00:00` liegt.

## 🌡️ AM2301/Tasmota Klima-Sensor

Das Sensor-Widget fragt lokal einen Tasmota-Endpunkt ab:

```text
GET /api/tasmota/sensor?ip=192.168.178.40
```

Die IP ist im Präferenzen-Menü änderbar und wird im Browser per `localStorage` gespeichert. Das Backend akzeptiert bewusst nur private IPv4-Adressen.

## 📞 Fritz!Box Monitor & Call-Monitor

Das Dashboard enthält ein integriertes, hochmodernes Fritz!Box-Widget zur Echtzeitüberwachung deines Heimnetzwerks und der Telefonie:

- **Live Netzwerk- & Internet-Status (LEDs):** Das System misst alle 10 Sekunden asynchron und extrem ressourcenschonend die Latenz zu deinem lokalen Gateway (Fritz!Box) und einem öffentlichen DNS (`1.1.1.1`), um die Latenzen in Millisekunden und den Online-Zustand per leuchtender LED (Grün/Rot) darzustellen.
- **Echtzeit-Anruf-Monitor:** Verbindet sich backendseitig über einen robusten, selbstheilenden TCP-Client direkt mit Port `1012` deiner Fritz!Box. Bei einem eingehenden Anruf wird sofort ein bildschirmfüllendes, pulsierendes Pop-up auf allen Tablets eingeblendet. Nach Gesprächsende wird der Anruf mit Gesprächsdauer in die Anrufliste übernommen.
- **Anrufliste:** Zeigt die letzten 10 Anrufe mit Typ-Symbolen (Eingehend, Ausgehend, Verpasst, Verbunden) und Dauer in Echtzeit an.

### 🔐 Wichtig für deine Privatsphäre (Datensicherheit)
Die Zugangsdaten deiner Fritz!Box und dein Anrufprotokoll werden **ausschließlich lokal** in den Dateien `fritzbox.json` und `fritzbox_calls.json` gespeichert. Beide Dateien sind permanent über `.gitignore` blockiert und werden **niemals auf GitHub hochgeladen**!

### ⚙️ Einrichtung des Call-Monitors
Damit die Live-Anrufe auf Port 1012 an das Dashboard gesendet werden, muss der Call-Monitor deiner Fritz!Box einmalig freigeschaltet werden. Wähle dazu einfach an einem an der Fritz!Box angeschlossenen Telefon die Tastenkombination:
- **Aktivieren:** `#96*5*` (und abheben / wählen)
- **Deaktivieren (optional):** `#96*6*`

## 🚀 Betrieb

### Windows (Vollautomatisch & Empfohlen)
Doppelklicke im Projektverzeichnis einfach auf die Datei:
```text
start-dashboard.bat
```
*Diese Batch-Datei prüft automatisch Ihre Node.js-Pfade (inklusive Selbstreparatur bei fehlenden globalen Umgebungsvariablen), installiert eventuell fehlende Bibliotheken (`npm install`), öffnet direkt Ihren Webbrowser mit dem Dashboard (`http://localhost:8443`) und startet den Server.*

### Linux & macOS (Manuell)
```bash
npm install
npm start
```

Standardmäßig läuft der Server (auf Linux/macOS mit SSL) auf:

```text
https://0.0.0.0:8443
```

Optional per Environment überschreibbar:

```bash
PORT=8443 HOST=0.0.0.0 npm start
```

### Docker & TrueNAS (Sehr einfach & Robust)
Das Dashboard wurde vollständig containerisiert. Dies ist die einfachste und ausfallsicherste Methode, um das Dashboard im Dauerbetrieb laufen zu lassen – perfekt für dein **TrueNAS SCALE** oder einen Docker-Host im Heimnetzwerk.

Alle Details, Volumes zur permanenten Datensicherung und Schritt-für-Schritt-Anleitungen findest du in der dedizierten Anleitung:
👉 **[Docker & TrueNAS Setup Guide (DOCKER_TRUENAS.md)](DOCKER_TRUENAS.md)**

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

Für Tablets, bei denen Browser-`speechSynthesis` in Fully/WebView stumm bleibt, kann das Backend optional Fullys eigene Remote-Admin-TTS-API nutzen. Das Passwort bleibt lokal in der Server-Umgebung und gehört nicht ins Repo:

```bash
FULLY_TTS_URL=http://tablet-ip:2323
FULLY_TTS_PASSWORD=your-local-fully-password
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
