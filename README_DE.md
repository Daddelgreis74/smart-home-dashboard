> 🌐 **Language / Sprache:** &nbsp; 🇬🇧 [English](README.md) &nbsp;|&nbsp; 🇩🇪 [Deutsch](README_DE.md)

# Smart Home Dashboard v3 · Neo Deck 🏠👻

![Dashboard Vorschau](preview.png)

Ein modernes, hochgradig anpassbares Smart-Home-Wandpanel für Tablets (optimiert für ein **Lenovo Tab M10 FHD Plus (10.3", 1920×1200, 16:10)** im Querformat). Perfekt ausgelegt für den dauerhaften Betrieb im **Fully Kiosk Browser**.

---

## ⚡ Schnellstart (One-Liner-Installation)

Die schnellste Methode, um das Dashboard einzurichten. Der Installer prüft automatisch alle Abhängigkeiten (Node.js, Git, npm, optional Docker) und installiert fehlende Programme nach.

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
*Ermöglicht die Wahl zwischen lokaler Installation (inklusive vollautomatischer Einrichtung als Systemd-Hintergrunddienst für den Start beim Booten) oder einer Docker-Compose-Bereitstellung.*

---

## ✨ Highlights & Features

- **Multi-Theme-System:** 6 edle, frei umschaltbare Premium-Designs (Neo-Aurora Glassmorphism, Cyberpunk Tactical HUD, Cozy Nordic Dark, Retrowave Laser Synth, Terminal Classic und OLED Stealth) mit persistentem Speicher.
- **Adaptive Widgets:** Das Layout passt sich dynamisch an das Seitenverhältnis und den Viewport des Tablets an, um abgeschnittene Inhalte zu verhindern.
- **Wetter Pro:** Open-Meteo Integration mit Temperatur, Gefühlter Temperatur, Min/Max, Luftfeuchte, Regenwahrscheinlichkeit, Wind, Luftdruck, Wolken und UV-Index (ohne API-Key).
- **Smart Home / Tasmota:** Lokale Geräteverwaltung, automatischer Netzwerk-Scan und Toggle-Buttons mit Statusanzeige sowie Offline-Dimmung.
- **AM2301 Klima-Sensor:** Eigenes Tasmota-Sensor-Widget mit Temperatur-/Feuchtigkeits-Gauges und Taupunkt.
- **Abfallkalender:** `.ics` Upload, kommende Leerungen, farbige Tonnen-Icons und kalendertagsgenaue Heute/Morgen-Anzeige.
- **Interaktiver Terminkalender:** Manuelle Termineingabe direkt über ein Modal-Formular, Live-Updates per WebSockets, automatische clientseitige Erinnerungen (Visuelle Popups, Audio-Beeps, Sprachausgabe) und vollständige J.A.R.V.I.S.-Integration (Sprachbefehle zum Eintragen und Abfragen).
- **J.A.R.V.I.S. KI-Assistent:** Integriertes Sprach- und Text-Eingabewidget mit animiertem Arc-Reaktor / Orbital-Visualisierer (Visualisierung der TTS- und Listening-Zustände), lokalem Chat-Verlauf, flexibler Provider-Konfiguration (Gemini, OpenRouter oder benutzerdefiniert) und anpassbarem System-Prompt.
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

---

## 🐋 Docker & TrueNAS Setup Guide

Dieses Projekt ist vollständig containerisiert. Alle Einstellungen, hochgeladene Kalenderdateien (`calendar.ics`), Webradio-Sender, Fritz!Box-Verbindungsdaten, Kameras und Anruflisten werden über ein einziges persistentes Volume gesichert. Das macht den Betrieb auf einem **TrueNAS SCALE**-Heimserver oder jedem anderen Docker-Host extrem einfach.

### 📂 Struktur der persistenten Daten

Alle Daten werden im Container unter `/app/data` verwaltet. Wenn du dieses Verzeichnis auf einen Host-Pfad mountest, entstehen dort automatisch folgende Dateien und Ordner:

| Datei / Ordner | Beschreibung |
| :--- | :--- |
| `tasmota.json` | Konfiguration deiner lokalen Tasmota-Geräte |
| `radio.json` | Deine gespeicherten Webradio-Sender |
| `cameras.json` | Deine Kamera-Streams |
| `fritzbox.json` | Verbindungs- und Zugangsdaten deiner Fritz!Box |
| `fritzbox_calls.json` | Die lokale Anrufliste des Call-Monitors |
| `presence.json` | Einstellungen zur Anwesenheitserkennung |
| `uploads/` | Enthält deine hochgeladene Abfallkalender-Datei (`calendar.ics`) |
| `ssl/` | (Optional) Für HTTPS: Lege hier `key.pem` und `cert.pem` ab |

---

### 🎛️ Methode 1: TrueNAS SCALE App Store (Empfohlen)

Das Smart Home Dashboard ist als **offizielle Community App** im TrueNAS App Store verfügbar:

👉 [**Im TrueNAS App-Katalog anzeigen**](https://apps.truenas.com/catalog/smart-home-dashboard_community/)

1. Öffne **Apps** ➡️ **Discover Apps** in deiner TrueNAS Web-Oberfläche.
2. Suche nach `Smart Home Dashboard` und klicke auf **Install**.
3. Folge dem Installationsassistenten für Speicher, Port (Standard `30436`) und Umgebung.
4. Klicke auf **Save** – fertig! Die App läuft.

---

### 🛠️ Methode 2: Docker Compose (CLI & SSH)

1. **Repository klonen:**
   ```bash
   git clone https://github.com/Daddelgreis74/smart-home-dashboard.git
   cd smart-home-dashboard
   ```
2. **Container im Hintergrund starten:**
   ```bash
   docker compose up -d --build
   ```
   Das Dashboard ist sofort unter `http://<DEINE-SERVER-IP>:8443` erreichbar!

---

### 📝 Methode 3: TrueNAS Custom App (GUI-Installation)

Falls du das Dashboard manuell als Custom App über die TrueNAS-Weboberfläche installieren möchtest, folge diesen Schritten:

#### Schritt 1: Dataset & Berechtigungen vorbereiten
Da der Container als Benutzer `568:568` (Standard-User `apps` in TrueNAS) ausgeführt wird, müssen die Berechtigungen für das Datenverzeichnis auf dem TrueNAS-Host vorbereitet werden.

Ersetze `/mnt/dein-pool/dein-dataset/smart-home-dashboard` mit deinem tatsächlichen TrueNAS-Dataset-Pfad:
```bash
mkdir -p /mnt/dein-pool/dein-dataset/smart-home-dashboard
chown -R 568:568 /mnt/dein-pool/dein-dataset/smart-home-dashboard
chmod -R 770 /mnt/dein-pool/dein-dataset/smart-home-dashboard
```

#### Schritt 2: Installation über die TrueNAS-Weboberfläche
1. Gehe in TrueNAS auf **Apps** ➡️ **Discover Apps** ➡️ **Custom App** (oben rechts).
2. Fülle die Felder wie folgt aus:
   * **Application Name:** `smart-home-dashboard`
   * **Repository:** `ghcr.io/daddelgreis74/smart-home-dashboard`
   * **Tag:** `3.9.8` *(oder `latest`)*
3. **Netzwerk-Konfiguration (Sehr wichtig für die Bandbreitenmessung):**
   * **Empfehlung:** Aktiviere die Checkbox **Host Network**. Dadurch teilt sich der Container die Netzwerkkarte mit dem TrueNAS-Host, und das System-Status-Widget auf dem Dashboard kann die echte Netzwerkgeschwindigkeit deines Servers messen.
   * *Hinweis bei Host-Network:* Die App lauscht dann direkt auf dem Port `8443` deines TrueNAS-Servers. Du erreichst das Dashboard unter `http://<DEINE-TRUENAS-IP>:8443`.
   * *Alternative (Bridge):* Wenn du kein Host-Netzwerk möchtest, deaktiviere die Checkbox, füge eine Portweiterleitung hinzu und leite den Host-Port `30436` auf den Container-Port `8443` um. (Hierbei bleibt die Netzwerkmessung im Dashboard jedoch bei `0.00 MB/s`).
4. **Speicher-Konfiguration (Storage):**
   * Füge ein **Host Path Volume** hinzu:
     * **Host Path:** `/mnt/dein-pool/dein-dataset/smart-home-dashboard` (Dein zuvor erstellter Pfad)
     * **Mount Path:** `/app/data`
5. Klicke ganz unten auf **Save** – fertig! TrueNAS startet das Dashboard.

---

## ⚙️ Erweiterte Konfiguration

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
