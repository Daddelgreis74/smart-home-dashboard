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
   git clone https://github.com/DEIN-GITHUB-BENUTZERNAME/smart-home-dashboard.git
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



### Schritt 3: Speichern & Starten
Klicke auf **Save**. TrueNAS lädt die App und startet sie. Sobald der Status auf `Active` steht, kannst du das Dashboard über die IP deines TrueNAS-Servers auf Port `8443` aufrufen!

---

## 🔒 Kalender & SSL einbinden

* **Kalender:** Lade deine `.ics`-Datei einfach wie gewohnt direkt über die Dashboard-Oberfläche in den Einstellungen hoch. Sie wird automatisch in deinem persistenten Host-Pfad unter `/data/uploads/calendar.ics` abgelegt und bleibt dauerhaft gespeichert.
* **HTTPS / SSL:** Wenn du eine sichere Verbindung wünschst, erstelle einfach in deinem gemounteten `data`-Ordner ein Unterverzeichnis `ssl` und lege dort `key.pem` und `cert.pem` ab. Der Server erkennt diese beim nächsten Start automatisch und schaltet auf HTTPS um.

---

## 🧭 Bedienung & Steuerung im Alltag (Für Einsteiger)

Da wir den Container mit dem Parameter `-d` (detached) im Hintergrund gestartet haben, läuft das Dashboard vollautomatisch und lautlos im Hintergrund. Du musst die Konsole im normalen Betrieb nicht geöffnet lassen.

Solltest du das Dashboard doch einmal steuern oder aktualisieren wollen, navigiere in der Konsole auf deinem TrueNAS in den Ordner `smart-home-dashboard` und verwende diese einfachen Befehle:

### 🟢 1. Dashboard aufrufen
Öffne einen beliebigen Webbrowser auf deinem PC, Tablet oder Smartphone und gib Folgendes ein:
```text
http://<DEINE-TRUENAS-IP>:8443
```

### 🔴 2. Dashboard stoppen (Ausschalten)
Wenn du den Server warten oder das Dashboard vorübergehend abschalten willst:
```bash
docker compose down
```

### 🟢 3. Dashboard starten (Einschalten)
Um das Dashboard wieder einzuschalten:
```bash
docker compose up -d
```

### 🔍 4. Status prüfen
Um zu sehen, ob das Dashboard aktiv ist und fehlerfrei läuft:
```bash
docker compose ps
```

---

## 🔄 Updates einspielen

Wenn eine neue Version des Dashboards auf GitHub veröffentlicht wird, kannst du dein TrueNAS ganz einfach und ohne Datenverlust updaten:

1. Navigiere in deinen Ordner auf dem TrueNAS:
   ```bash
   cd /dein-pfad-zu/smart-home-dashboard
   ```
2. Lade den neuesten Code von GitHub herunter:
   ```bash
   git pull
   ```
3. Baue und starte den Container neu:
   ```bash
   docker compose up -d --build
   ```

*Hinweis: Deine Einstellungen (Kameras, Fritz!Box-Passwörter etc.) im Ordner `data/` bleiben bei diesem Vorgang komplett unangetastet und sicher auf deinen ZFS-Platten liegen!*
