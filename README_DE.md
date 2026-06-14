> 🌐 **Language / Sprache:** &nbsp; 🇬🇧 [English](README.md) &nbsp;|&nbsp; 🇩🇪 [Deutsch](README_DE.md)

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

- **Multi-Theme-System:** 5 edle, frei umschaltbare Premium-Designs (Neo-Aurora Glassmorphism, Cyberpunk Tactical HUD, Cozy Nordic Dark, Retrowave Laser Synth, Terminal Classic, OLED Stealth) mit persistentem Speicher im Browser.
- **Neo Aurora Command Deck:** dunkles, hochwertiges Wall-Panel-Design mit Aurora-Glow, Glas-/Metal-Karten und adaptivem 2-Reihen-Layout.
- **Adaptive Widgets:** Layout passt sich besser an Seitenverhältnis und Fully-Kiosk-Viewport an, statt unten Inhalte abzuschneiden.
- **Wetter Pro:** Open-Meteo Daten mit Temperatur, Gefühlter Temperatur, Min/Max, Luftfeuchte, Regenwahrscheinlichkeit, Wind, Luftdruck, Wolken und UV-Index.
- **Smart Home / Tasmota:** lokale Geräteverwaltung, Scan im privaten Heimnetz, Toggle-Buttons mit Statusanzeige und Offline-Dimmung.
- **AM2301 Klima-Sensor:** eigenes Tasmota-Sensor-Widget mit Temperatur-/Feuchte-Gauges, Taupunkt und konfigurierbarer lokaler IP.
- **Abfallkalender:** `.ics` Upload, kommende Leerungen, farbige Mülltonnen-Icons und kalendertagsgenaue Heute/Morgen-Anzeige ohne Uhrzeit-Versatz.
- **Live Radio:** Preset-Tasten im Dashboard, Senderverwaltung in den Präferenzen, HLS/MP3/AAC-Unterstützung und Schutz gegen ungewollten Autostart beim Tablet-Wakeup.
- **System Status:** Live CPU/RAM/Temperatur/Netzwerk per Socket.IO.
- **Fritz!Box Monitor:** Live Netzwerk- & Internet-Status (LEDs/Latenz in ms) sowie ein Echtzeit-Anruf-Monitor (Port 1012) mit bildschirmfüllendem Live-Anrufer-Overlay (Toast) und historischer Anrufliste.
- **Mehrsprachigkeit (i18n):** Vollständige Benutzeroberflächen-Übersetzungen für 🇩🇪 Deutsch, 🇬🇧 Englisch, 🇫🇷 Französisch, 🇪🇸 Spanisch, 🇮🇹 Italienisch, 🇳🇱 Niederländisch und 🇵🇱 Polnisch, direkt in den Einstellungen umschaltbar.
- **Touch-ready:** Drag & Drop via Sortable.js mit Fully-Kiosk-kompatibler Verzögerung.

## 🧭 Bedienung

### Präferenzen
Über das Menü oben rechts lassen sich konfigurieren:

- Design-Thema & Sprache
- sichtbare Widgets
- Tasmota-Geräte und Subnetz-Scan
- AM2301/Tasmota-Klima-Sensor-IP
- Abfallkalender-Upload
- Wetterstandort
- Radio-Sender und Preset-Tasten
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

## 🚀 Betrieb & Installation

Das Dashboard kann entweder vollautomatisch über eine einzige Terminal-Zeile (One-Liner) oder manuell eingerichtet werden.

### ⚡ One-Liner-Installation (Schnell & Automatisch)

Die Installer prüfen automatisch alle Abhängigkeiten (Node.js, Git, npm, optional Docker) auf deinem System und installieren fehlende Programme nach.

#### Windows (PowerShell)
Öffne die PowerShell und führe folgenden Befehl aus:
```powershell
irm https://raw.githubusercontent.com/Daddelgreis74/smart-home-dashboard/main/install.ps1 | iex
```
*Unter Windows werden fehlende Abhängigkeiten (wie Git oder Node.js) vollautomatisch über den Windows Package Manager (`winget`) installiert. Auf Wunsch wird eine Desktop-Verknüpfung angelegt.*

#### Linux / Raspberry Pi (Bash)
Öffne dein Terminal und führe folgenden Befehl aus:
```bash
bash <(curl -fsSL https://raw.githubusercontent.com/Daddelgreis74/smart-home-dashboard/main/install.sh)
```
*Bietet die Wahl zwischen lokaler Installation (inkl. vollautomatischer Einrichtung als Systemd-Hintergrunddienst) oder einer Docker-Compose-Bereitstellung.*

---

### 🛠️ Manuelle Installation

#### Windows
1. Lade dir dieses Repository als ZIP herunter (oder klone es) und entpacke es.
2. Doppelklicke im Projektverzeichnis einfach auf die Datei:
   ```text
   start-dashboard.bat
   ```
   *Diese Batch-Datei prüft automatisch deine Node.js-Pfade, installiert fehlende Bibliotheken (`npm install`), öffnet das Dashboard im Browser und startet den Server.*

#### Linux & macOS
1. Repository klonen:
   ```bash
   git clone https://github.com/Daddelgreis74/smart-home-dashboard.git
   cd smart-home-dashboard
   ```
2. Abhängigkeiten installieren und starten:
   ```bash
   npm install
   npm start
   ```

Standardmäßig läuft der manuelle Server auf:
```text
http://localhost:8443   (bzw. https://localhost:8443 mit SSL)
```

## 🐋 Docker & TrueNAS Setup Guide

Dieses Projekt ist vollständig containerisiert. Alle Einstellungen, hochgeladene Kalenderdateien (`calendar.ics`), Webradio-Sender, Fritz!Box-Verbindungsdaten, Kameras und Anruflisten werden über ein einziges persistentes Volume gesichert. Das macht den Betrieb auf einem **TrueNAS SCALE**-Heimserver (Electric Eel & neuer) oder jedem anderen Docker-Host extrem einfach.

> [!TIP]
> Der einfachste Weg ist die Installation über den **TrueNAS App Store** (Methode 1). Kein SSH, kein YAML, keine Docker-Befehle nötig.

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

Updates werden automatisch über den TrueNAS-Katalog bereitgestellt. Wenn eine neue Version verfügbar ist, erscheint ein **Update**-Badge auf der App-Kachel in deiner Web-Oberfläche.

---

### 🛠️ Methode 2: Docker Compose (CLI & SSH)

Wenn du Docker auf einem Linux-Server, NAS oder mit einem Tool wie **Portainer** / **Dockge** betreibst:

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
   * **Tag:** `3.9.8`  *(oder `latest`)*
3. **Netzwerk-Konfiguration (Sehr wichtig für die Bandbreitenmessung):**
   * **Empfehlung:** Aktiviere die Checkbox **Host Network**. Dadurch teilt sich der Container die Netzwerkkarte mit dem TrueNAS-Host, und das System-Status-Widget auf dem Dashboard kann die echte Netzwerkgeschwindigkeit deines Servers messen.
   * *Hinweis bei Host-Network:* Die App lauscht dann direkt auf dem Port `8443` deines TrueNAS-Servers. Du erreichst das Dashboard unter `http://<DEINE-TRUENAS-IP>:8443`.
   * *Alternative (Bridge):* Wenn du kein Host-Netzwerk möchtest, deaktiviere die Checkbox, füge eine Portweiterleitung hinzu und leite den Host-Port `30436` auf den Container-Port `8443` um. (Hierbei bleibt die Netzwerkmessung im Dashboard jedoch bei `0.00 MB/s`).
4. **Speicher-Konfiguration (Storage):**
   * Füge ein **Host Path Volume** hinzu:
     * **Host Path:** `/mnt/dein-pool/dein-dataset/smart-home-dashboard` (Dein zuvor erstellter Pfad)
     * **Mount Path:** `/app/data`
5. Klicke ganz unten auf **Save** – fertig! TrueNAS lädt das Image herunter und startet das Dashboard.

---

### 🎮 Tägliche Befehle (Docker Compose)

* **Stoppen:** `docker compose down`
* **Starten:** `docker compose up -d`
* **Status:** `docker compose ps`
* **Logs:** `docker compose logs -f`

---

### 🔄 Updates ohne Datenverlust

#### TrueNAS App Store (Methode 1):
Wenn eine neue Version verfügbar ist, klicke einfach auf den **Update**-Button auf der App-Kachel in der TrueNAS Web-Oberfläche. Das war's!

#### Docker Compose (Methode 2):
```bash
cd smart-home-dashboard
git pull
docker compose up -d --build
```

> [!IMPORTANT]
> Deine Einstellungen, Konfigurationen und hochgeladenen Kalenderdateien im Datenverzeichnis bleiben bei allen Updates sicher und unangetastet!

---

## 🧪 Checks

```bash
node --check server.js
node --check public/app.js
npm audit --omit=dev
```

Mit 👻 entwickelt von **Neo**, dem digitalen Hausgeist.

