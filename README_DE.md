> 🌐 **Language / Sprache:** &nbsp; 🇬🇧 [English](README.md) &nbsp;|&nbsp; 🇩🇪 [Deutsch](README_DE.md)

# Smart Home Dashboard v3 · Neo Deck 🏠👻

![Dashboard Vorschau](preview.png)

Ein modernes, hochgradig anpassbares Smart-Home-Wandpanel für Tablets (optimiert für ein **Lenovo Tab M10 FHD Plus (10.3", 1920×1200, 16:10)** im Querformat). Perfekt ausgelegt für den dauerhaften Betrieb im **Fully Kiosk Browser**.

---

## ⚡ Schnellstart (One-Liner-Installation)

Die schnellste Methode, um das Dashboard einzurichten. Der Installer prüft automatisch alle Abhängigkeiten (Node.js, Git, npm) und installiert fehlende Programme nach.

### 💻 Windows (PowerShell)
Öffne die PowerShell und führe folgenden Befehl aus:
```powershell
irm https://raw.githubusercontent.com/Daddelgreis74/smart-home-dashboard/main/install.ps1 | iex
```
*Fehlende Programme (wie Git oder Node.js) werden vollautomatisch über den Windows Package Manager (`winget`) installiert. Auf Wunsch wird direkt eine Desktop-Verknüpfung angelegt.*

### 🐧 Linux / Raspberry Pi (Bash)
Öffne das Terminal und führe folgenden Befehl aus:
```bash
bash <(curl -fsSL https://raw.githubusercontent.com/Daddelgreis74/smart-home-dashboard/main/install.sh)
```
*Führt eine lokale Installation inklusive vollautomatischer Einrichtung als Systemd-Hintergrunddienst für den Start beim Booten durch.*

---

## ✨ Highlights & Features

- **Multi-Theme-System:** 6 edle, frei umschaltbare Premium-Designs (Neo-Aurora Glassmorphism, Cyberpunk Tactical HUD, Cozy Nordic Dark, Retrowave Laser Synth, Terminal Classic und OLED Stealth) mit persistentem Speicher.
- **Adaptive Widgets:** Das Layout passt sich dynamisch an das Seitenverhältnis und den Viewport des Tablets an, um abgeschnittene Inhalte zu verhindern.
- **Wetter Pro:** Open-Meteo Integration mit Temperatur, Gefühlter Temperatur, Min/Max, Luftfeuchte, Regenwahrscheinlichkeit, Wind, Luftdruck, Wolken und UV-Index (ohne API-Key).
- **Smart Home / Tasmota:** Lokale Geräteverwaltung, automatischer Netzwerk-Scan und Toggle-Buttons mit Statusanzeige sowie Offline-Dimmung.
- **AM2301 Klima-Sensor:** Eigenes Tasmota-Sensor-Widget mit Temperatur-/Feuchtigkeits-Gauges und Taupunkt.
- **Abfallkalender:** `.ics` Upload, kommende Leerungen, farbige Tonnen-Icons und kalendertagsgenaue Heute/Morgen-Anzeige.
- **Interaktiver Terminkalender:** Manuelle Termineingabe direkt über ein Modal-Formular, Live-Updates per WebSockets, automatische clientseitige Erinnerungen (Visuelle Popups, Audio-Beeps, Sprachausgabe) und J.A.R.V.I.S.-Integration.
- **J.A.R.V.I.S. KI-Assistent:** Integriertes Sprach-/Text-Eingabewidget mit animiertem Arc-Reaktor / Orbital-Visualisierer, lokalem Chat-Verlauf, Provider-Konfiguration (Gemini 3.5 Flash standardmäßig, OpenRouter) und anpassbarem System-Prompt.
- **Smart-Home-Timer:** Kreisförmiger 3D-Timer (Stunden, Minuten, Sekunden über Walzen-Picker einstellbar) mit Presets, Loop-Alarmton (Gong, Glocke, etc.), Multi-Client-Synchronisation über WebSockets und Server-seitiger Zustandshaltung (für zuverlässige Synchronisierung nach dem Standby).
- **Key-Status-Indikatoren:** Farbige Leuchtpunkte (🟢/🔴) in den Einstellungen für schnelles Feedback über gespeicherte API-Keys sowie dedizierte Buttons zum Löschen von API-Schlüsseln.
- **Live Radio:** Preset-Tasten, integrierte Senderverwaltung in den Einstellungen und HLS/MP3/AAC-Unterstützung mit Autostart-Schutz beim Aufwecken des Tablets.
- **System Status:** Live CPU, RAM, Temperatur und Netzwerk-Statistiken per Socket.IO.
- **Fritz!Box Monitor:** Live-Latenz und Online-Zustand (LEDs) sowie ein Echtzeit-Anruf-Monitor (Port 1012) mit vollflächigem Pop-up-Overlay bei Anruf und historischer Anrufliste.
- **Mehrsprachigkeit (i18n):** Vollständige Übersetzungen für 🇩🇪 Deutsch, 🇬🇧 Englisch, 🇫🇷 Französisch, 🇪🇸 Spanisch, 🇮🇹 Italienisch, 🇳🇱 Niederländisch und 🇵🇱 Polnisch.


---

## 🎨 Dashboard Themes

Das Dashboard lässt sich direkt über das Zahnrad-Menü oben rechts zwischen folgenden Designs umschalten:

| Theme | Vorschau |
| :--- | :--- |
| **Neo-Aurora**<br>Transparente Frosted-Glass-Karten mit weichen Auras und leuchtenden Widgets. | ![Neo-Aurora](public/themes/neo_aurora.png) |
| **Cyberpunk HUD**<br>Taktischer High-Tech-Look in Orange/Amber mit scharfen Ecken und Gitter-Hintergrund. | ![Cyberpunk HUD](public/themes/cyberpunk_hud.png) |
| **Cozy Nordic Dark**<br>Beruhigende, organische Ästhetik mit salbeigrünen Akzenten und weichen Schatten. | ![Cozy Nordic Dark](public/themes/nordic_dark.png) |
| **Retrowave Laser Synth**<br>Nostalgischer 80er-Retro-Look in Pink/Cyan mit perspektivischer Laser-Bodenlinie. | ![Retrowave Laser Synth](public/themes/retrowave_synth.png) |

---

## 🛠️ Manuelle Installation

Falls du die One-Liner-Skripte nicht nutzen möchtest, kannst du die App manuell einrichten:

### Windows
1. Lade dieses Repository herunter und entpacke es.
2. Doppelklicke im Projektverzeichnis einfach auf die Datei:
   ```text
   start-dashboard.bat
   ```
   *Diese Batch-Datei prüft deine Pfade, installiert bei Bedarf Bibliotheken (`npm install`), öffnet das Dashboard im Browser und startet den Server.*

### Linux & macOS
1. Repository klonen und in den Ordner wechseln:
   ```bash
   git clone https://github.com/Daddelgreis74/smart-home-dashboard.git
   cd smart-home-dashboard
   ```
2. Bibliotheken installieren und starten:
   ```bash
   npm install
   npm start
   ```
   Der manuelle Server läuft standardmäßig auf `http://localhost:8443` (oder `https://localhost:8443` mit SSL).

## ⚙️ Erweiterte Konfiguration

### 🌐 Umgebungsvariablen

Die Anwendung kann über folgende Umgebungsvariablen konfiguriert werden:

| Variable | Standardwert | Beschreibung |
| :--- | :--- | :--- |
| `PORT` | `8443` | Der primäre Port des Dashboard-Webservers (HTTPS falls SSL-Zertifikate existieren, andernfalls HTTP). |
| `HOST` | `0.0.0.0` | Die IP-Schnittstelle, an die sich der Server bindet. |
| `DATA_DIR` | (App-Verzeichnis) | Pfad zum Verzeichnis, in dem alle Konfigurationen (`tasmota.json` etc.) gespeichert werden. |
| `UPLOAD_DIR` | `DATA_DIR/uploads` | Pfad zum Verzeichnis, in dem hochgeladene `.ics`-Dateien gespeichert werden. |
| `SSL_DIR` | `DATA_DIR/ssl` | Pfad zum Verzeichnis mit den SSL-Zertifikaten (`key.pem` und `cert.pem`). |
| `AUTO_SSL` | `false` | Auf `true` setzen, um automatisch ein selbstsigniertes SSL-Zertifikat zu generieren, falls keines in `SSL_DIR` vorhanden ist. |



### 📞 Fritz!Box Monitor & Call-Monitor einrichten
- **Verbindung:** Die Zugangsdaten deiner Fritz!Box und dein Anrufprotokoll werden **ausschließlich lokal** in den Dateien `fritzbox.json` und `fritzbox_calls.json` gespeichert.
- **Freischaltung des Call-Monitors:** Damit Live-Anrufe auf Port 1012 an das Dashboard gesendet werden, muss der Call-Monitor deiner Fritz!Box einmalig freigeschaltet werden. Wähle dazu an einem an der Fritz!Box angeschlossenen Telefon:
  * **Aktivieren:** `#96*5*` (und abheben/wählen)
  * **Deaktivieren (optional):** `#96*6*`

### 🌡️ AM2301/Tasmota Klima-Sensor
Das Sensor-Widget fragt lokal einen Tasmota-Endpunkt ab:
`GET /api/tasmota/sensor?ip=192.168.178.40`
Die IP ist im Präferenzen-Menü oben rechts änderbar. Das Backend akzeptiert bewusst nur private IPv4-Adressen.

### 🗓️ Abfallkalender-Datumslogik
Ganztägige `.ics` Termine werden als lokale Kalendertage verglichen. Dadurch wird z.B. eine morgige Leerung morgens nicht mehr fälschlich als „Heute“ angezeigt, nur weil die aktuelle Uhrzeit bereits nach `00:00` liegt.

---

## 🔐 Sicherheit & Lokale Dateien

Folgende Dateien enthalten persönliche Konfigurationen und werden **niemals auf GitHub hochgeladen** (über `.gitignore` geschützt):
- `appointments.json`, `data/`, `www/`, `radio.json`, `tasmota.json`, `fritzbox.json`, `fritzbox_calls.json`, `presence.json`, `uploads/`, `node_modules/`, `ssl/`

---

## 🧪 Checks & Tests
Du kannst die Integrität der Dateien manuell mit folgenden Befehlen überprüfen:
```bash
node --check server.js
node --check public/app.js
npm audit --omit=dev
```

---
Mit 👻 entwickelt von **Neo**, dem digitalen Hausgeist.
