# 🐋 Docker & TrueNAS Setup Guide

Dieses Projekt wurde vollständig containerisiert. Alle Konfigurationen, hochgeladenen Kalenderdateien (`calendar.ics`), Anruflisten und Einstellungen werden über ein einziges persistentes Volume gesichert. Das macht die Installation auf einem **TrueNAS SCALE** Server oder jedem anderen Docker-Host extrem einfach und sicher.

---

## 📂 Struktur der persistenten Daten

Alle Daten werden im Container unter `/app/data` gespeichert. Wenn du dieses Verzeichnis auf einen Host-Pfad mountest, entstehen dort automatisch folgende Dateien und Ordner:
* `tasmota.json` (Deine Tasmota-Geräte)
* `radio.json` (Deine Webradio-Sender)
* `cameras.json` (Deine Kamera-Konfigurationen)
* `fritzbox.json` (Deine Fritz!Box Login-Konfiguration)
* `fritzbox_calls.json` (Deine Fritz!Box Anrufliste)
* `presence.json` (Deine Anwesenheits-Demos/Konfigurationen)
* `uploads/` (Enthält deine hochgeladene `calendar.ics`)
* `ssl/` (Optional für HTTPS: `key.pem` und `cert.pem`)

---

## 🛠️ Methode 1: Docker Compose (Empfohlen)

Wenn du SSH-Zugriff auf dein TrueNAS hast oder ein Tool wie **Portainer / Dockge** auf TrueNAS nutzt, ist dies der schnellste Weg:

1. **Repository klonen** (falls nicht bereits geschehen):
   ```bash
   git clone https://github.com/Daddelgreis74/smart-home-dashboard.git
   cd smart-home-dashboard
   ```

2. **Ordner für Daten erstellen:**
   ```bash
   mkdir data
   ```

3. **Container bauen und starten:**
   ```bash
   docker compose up -d --build
   ```

Das Dashboard ist nun unter `http://<DEINE-TRUENAS-IP>:8443` erreichbar!

---

## 🎛️ Methode 2: TrueNAS SCALE Web-Oberfläche (Custom App)

TrueNAS SCALE ermöglicht es, beliebige Docker-Images direkt über die Benutzeroberfläche als App zu starten.

### Schritt 1: Docker-Image vorbereiten
Da das Image auf deinem Server gebaut werden muss, kannst du es entweder lokal auf TrueNAS bauen und in die lokale Registry legen, oder du baust es auf deinem PC und schiebst es hoch.
Alternativ kannst du es direkt über SSH auf TrueNAS bauen:
```bash
docker build -t local/smart-home-dashboard:latest .
```

### Schritt 2: App in TrueNAS SCALE erstellen
1. Navigiere im TrueNAS-Webinterface zu **Apps** und klicke auf **Discover Apps** (oben rechts).
2. Klicke auf **Custom App** (oder **Launch Docker Image**).
3. Konfiguriere die App wie folgt:

#### 1. Application Name
* **Application Name:** `smart-home-dashboard`

#### 2. Container Image Details
* **Image Repository:** `local/smart-home-dashboard` (oder der Name deines gebauten Images)
* **Image Tag:** `latest`

#### 3. Port Forwarding (Netzwerk)
Füge eine neue Port-Weiterleitung hinzu:
* **Container Port:** `8443`
* **Host Port:** `8443` (oder ein freier Wunschport deiner Wahl)
* **Protocol:** `TCP`

#### 4. Storage (Persistente Daten sichern)
Um sicherzustellen, dass deine Einstellungen bei einem App-Update nicht gelöscht werden, erstelle einen **Host Path Volume Mount**:
* **Mount Path (im Container):** `/app/data`
* **Host Path (auf TrueNAS ZFS Pool):** Wähle einen Ordner auf deinem ZFS-Pool (z. B. `/mnt/tank/apps/smart-home-dashboard/data`).

*(Hinweis: TrueNAS erstellt diesen Ordner automatisch. Alle JSON-Konfigurationen und Kalenderdateien werden dort dauerhaft und sicher auf deinen ZFS-Festplatten gesichert).*

#### 5. Environment Variables (Optionale Umgebungsvariablen)
Falls gewünscht, kannst du Umgebungsvariablen hinzufügen:
* **Name:** `OPENCLAW_VOICE_TALK` | **Value:** `1` (Aktiviert Neo Sprachsteuerung)
* **Name:** `FULLY_TTS_URL` | **Value:** `http://<DEINE-TABLET-IP>:2323` (Sprachausgabe an Fully Kiosk)
* **Name:** `FULLY_TTS_PASSWORD` | **Value:** `dein_passwort`

### Schritt 3: Speichern & Starten
Klicke auf **Save**. TrueNAS lädt die App und startet sie. Sobald der Status auf `Active` steht, kannst du das Dashboard über die IP deines TrueNAS-Servers auf Port `8443` aufrufen!

---

## 🔒 Kalender & SSL einbinden

* **Kalender:** Lade deine `.ics`-Datei einfach wie gewohnt direkt über die Dashboard-Oberfläche in den Einstellungen hoch. Sie wird automatisch in deinem persistenten Host-Pfad unter `/data/uploads/calendar.ics` abgelegt und bleibt dauerhaft gespeichert.
* **HTTPS / SSL:** Wenn du eine sichere Verbindung wünschst, erstelle einfach in deinem gemounteten `data`-Ordner ein Unterverzeichnis `ssl` und lege dort `key.pem` und `cert.pem` ab. Der Server erkennt diese beim nächsten Start automatisch und schaltet auf HTTPS um.
