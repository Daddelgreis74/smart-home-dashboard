> 🌐 **Language / Sprache:** &nbsp; 🇬🇧 [English](README.md) &nbsp;|&nbsp; 🇩🇪 [Deutsch](README_DE.md)

# Smart Home Dashboard v3 · Neo Deck 🏠👻

![Dashboard Preview](preview.png)

A modern smart home wall panel for a **Lenovo Tab M10 FHD Plus (10.3", 1920×1200, 16:10)** in landscape mode. Optimized for 24/7 operation in the **Fully Kiosk Browser**.

### 🎨 Dashboard Themes (Preview)
The dashboard supports four completely different, switchable design styles:

* **Neo-Aurora (Default):** Transparent frosted-glass cards with soft auras and glowing widgets.
  ![Neo-Aurora](public/themes/neo_aurora.png)
* **Cyberpunk HUD:** Tactical high-tech look in orange/amber with sharp corners and grid background.
  ![Cyberpunk HUD](public/themes/cyberpunk_hud.png)
* **Cozy Nordic Dark:** Calming, organic aesthetic with sage green accents and soft shadows.
  ![Cozy Nordic Dark](public/themes/nordic_dark.png)
* **Retrowave Laser Synth:** Nostalgic 80s retro look in pink/cyan with perspective laser grid line.
  ![Retrowave Laser Synth](public/themes/retrowave_synth.png)

## ✨ Highlights

- **Multi-Theme System:** 5 premium, freely switchable designs (Neo-Aurora Glassmorphism, Cyberpunk Tactical HUD, Cozy Nordic Dark, Retrowave Laser Synth, Terminal Classic, OLED Stealth) with persistent browser storage.
- **Neo Aurora Command Deck:** Dark, high-quality wall panel design with aurora glow, glass/metal cards, and an adaptive 2-row layout.
- **Adaptive Widgets:** Layout adapts to the aspect ratio and Fully Kiosk viewport instead of cutting off content.
- **Weather Pro:** Open-Meteo data containing temperature, feels-like temperature, min/max, humidity, rain probability, wind speed, air pressure, cloud cover, and UV index.
- **Smart Home / Tasmota:** Local device management, private network subnet scan, toggle buttons with status indicators, and offline dimming.
- **AM2301 Climate Sensor:** Custom Tasmota sensor widget with temperature/humidity gauges, dew point, and configurable local IP.
- **Waste Calendar:** `.ics` upload, upcoming pick-ups, colored trash bin icons, and calendar-day precise "Today/Tomorrow" display without timezone or time shifts.
- **Live Radio:** Preset buttons in the dashboard, station management in preferences, HLS/MP3/AAC support, and protection against accidental autostart on tablet wakeup.
- **System Status:** Live CPU, RAM, temperature, and network stats via Socket.IO.
- **Fritz!Box Monitor:** Live network & internet status (LEDs/latency in ms) and a real-time call monitor (port 1012) with full-screen live caller overlay (Toast) and call history.
- **Touch-ready:** Drag & drop sorting via Sortable.js with Fully Kiosk compatible delay.

## 🧭 Operation

### Preferences
Through the menu in the upper right, you can configure:

- Active Theme
- Visible Widgets
- Tasmota Devices and Subnet Scan
- AM2301/Tasmota Climate Sensor IP
- Waste Calendar Upload (`.ics` files)
- Weather Location
- Radio Stations and Preset Buttons
- Fritz!Box Connection Details and Call Monitor

### Radio Autoplay Protection
The radio only starts on an explicit click of:

- Play button
- Preset button

When the tablet sleeps or wakes up, the active stream is stopped and the audio element is destroyed to prevent Fully Kiosk or Android from resuming the stream unexpectedly.

## 🛠️ Architecture

- **Backend:** Node.js, Express.js
- **Realtime:** Socket.IO
- **System Info:** `systeminformation`
- **Uploads:** `multer`
- **Frontend:** Vanilla JS, CSS Grid, Sortable.js, HLS.js
- **Weather:** Open-Meteo API (no API key required)
- **Port:** `8443`
- **HTTPS & HTTP Fallback:** Runs on HTTPS by default using certificates in `ssl/`. Provides an automatic, secure fallback to HTTP if no SSL certificates are present (ideal for local Windows testing).

## 🔐 Security & Local Files

Do not commit:

- `radio.json`
- `tasmota.json`
- `uploads/`
- `node_modules/`
- `fritzbox.json`
- `fritzbox_calls.json`

The `.gitignore` file is configured accordingly.

Backend hardening:

- JSON body limits
- `.ics` upload file size limit and file-type filter
- Tasmota toggle/scan/sensor requests restricted to private IPv4 ranges
- Radio URLs are validated and normalized

## 🗓️ Waste Calendar Date Logic

All-day `.ics` events are compared using local calendar days. This ensures that tomorrow's pick-up is not incorrectly displayed as "Today" just because the current time is past `00:00`.

## 🌡️ AM2301/Tasmota Climate Sensor

The sensor widget queries a local Tasmota endpoint:

```text
GET /api/tasmota/sensor?ip=192.168.178.40
```

The IP can be configured in the Preferences menu and is stored in the browser's `localStorage`. The backend only accepts private IPv4 addresses.

## 📞 Fritz!Box Monitor & Call Monitor

The dashboard contains a built-in Fritz!Box widget for real-time monitoring of your home network and telephony:

- **Live Network & Internet Status (LEDs):** The system measures latency to your local gateway (Fritz!Box) and public DNS (`1.1.1.1`) every 10 seconds to show network health.
- **Real-time Call Monitor:** Connects to port `1012` of your Fritz!Box via a self-healing TCP client. Incoming calls trigger a full-screen, pulsing pop-up overlay across all active dashboard panels. Finished calls are logged with call duration.
- **Call List:** Displays the last 10 calls with type icons (Incoming, Outgoing, Missed, Connected) and duration in real time.

### 🔐 Privacy & Security
Your Fritz!Box credentials and call log are stored **locally** on your host in `fritzbox.json` and `fritzbox_calls.json`. These files are ignored by Git and never uploaded to GitHub.

### ⚙️ Enabling the Fritz!Box Call Monitor
To allow the live call monitor on port 1012, you must enable it on your Fritz!Box by dialing the following code on a connected phone:
- **Enable:** `#96*5*` (and dial/call)
- **Disable (optional):** `#96*6*`

## 🚀 Execution

### Windows (Automated & Recommended)
Double-click the file in the project root:
```text
start-dashboard.bat
```
*This batch file checks Node.js environment paths, installs missing dependencies (`npm install`), launches the backend server, and opens your browser at `http://localhost:8443`.*

### Linux & macOS (Manual)
```bash
npm install
npm start
```

By default, the server runs on:

```text
https://0.0.0.0:8443
```

## 🐋 Docker & TrueNAS Setup Guide

This project is fully containerized. All settings, uploaded calendar files (`calendar.ics`), web radio streams, Fritz!Box connections, camera feeds, and call lists are persisted in a single mount volume. This makes running it on **TrueNAS SCALE** (Electric Eel & newer) or any other Docker host extremely simple.

> [!TIP]
> The easiest way to install is via the **TrueNAS App Store** (Method 1). No SSH, no YAML, no Docker commands needed.

### 📂 Persistent Data Structure

All data inside the container is stored under `/app/data`. Mounting this directory onto a host path will automatically create the following files and folders:

| File / Directory | Description |
| :--- | :--- |
| `tasmota.json` | Configuration of your local Tasmota devices |
| `radio.json` | Saved web radio stations |
| `cameras.json` | Camera stream configurations |
| `fritzbox.json` | Fritz!Box connection credentials |
| `fritzbox_calls.json` | Local call list from the call monitor |
| `presence.json` | Settings for presence detection |
| `uploads/` | Directory containing your waste calendar file (`calendar.ics`) |
| `ssl/` | (Optional) Store `key.pem` and `cert.pem` here to enable HTTPS |

---

### 🎛️ Method 1: TrueNAS SCALE App Store (Recommended)

The Smart Home Dashboard is available as an **official Community App** in the TrueNAS App Store:

👉 [**View in TrueNAS App Catalog**](https://apps.truenas.com/catalog/smart-home-dashboard_community/)

1. Go to **Apps** ➡️ **Discover Apps** in your TrueNAS Web UI.
2. Search for `Smart Home Dashboard` and click **Install**.
3. Follow the installation wizard to set up your storage, port (default `30436`), and environment.
4. Click **Save** – done! The app is running.

Updates are delivered automatically through the TrueNAS catalog. When a new version is available, an **Update** badge appears on the app card in your Web UI.

---

### 🛠️ Method 2: Docker Compose (CLI & SSH)

If you run Docker on a Linux server, NAS, or use a manager like **Portainer** or **Dockge**:

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Daddelgreis74/smart-home-dashboard.git
   cd smart-home-dashboard
   ```

2. **Start the container in the background:**
   ```bash
   docker compose up -d --build
   ```

The dashboard is accessible at `http://<YOUR-SERVER-IP>:8443`!

---

### 📝 Method 3: TrueNAS Custom App (Manual YAML)

If you want to install the dashboard manually without the App Store, you can paste a Docker Compose YAML directly:

#### Step 1: Prepare the Host Directory & Permissions
The container runs as user `568:568` (TrueNAS `apps` user). Set the correct permissions first:

Replace `/mnt/your-pool/your-dataset/smart-home-dashboard` with your actual TrueNAS dataset path:
```bash
mkdir -p /mnt/your-pool/your-dataset/smart-home-dashboard
chown -R 568:568 /mnt/your-pool/your-dataset/smart-home-dashboard
chmod -R 770 /mnt/your-pool/your-dataset/smart-home-dashboard
```

#### Step 2: Install via TrueNAS Custom App
1. Go to **Apps** ➡️ **Discover Apps** ➡️ **Custom App** (top right).
2. Give the application a name (e.g. `smart-home-dashboard`).
3. Paste the following YAML:

```yaml
services:
  smart-home-dashboard:
    image: ghcr.io/daddelgreis74/smart-home-dashboard:3.9.4
    restart: unless-stopped
    user: "568:568"
    ports:
      - "30436:30436"
    environment:
      PORT: "30436"
      HOST: "0.0.0.0"
      DATA_DIR: /app/data
    volumes:
      # Replace with your actual TrueNAS dataset path
      - /mnt/your-pool/your-dataset/smart-home-dashboard:/app/data
```

4. Click **Save** to deploy.

---

### 🎮 Daily Commands (Docker Compose)

* **Stop:** `docker compose down`
* **Start:** `docker compose up -d`
* **Status:** `docker compose ps`
* **Logs:** `docker compose logs -f`

---

### 🔄 Updates Without Data Loss

#### TrueNAS App Store (Method 1):
When a new version is available, click the **Update** button on the app card in the TrueNAS Web UI. That's it!

#### Docker Compose (Method 2):
```bash
cd smart-home-dashboard
git pull
docker compose up -d --build
```

> [!IMPORTANT]
> Your settings, configurations, and uploaded calendar files in the data directory remain untouched and safe across all updates!

---

## 🧪 Verification

```bash
node --check server.js
node --check public/app.js
npm audit --omit=dev
```

Developed with 👻 by **Neo**, the digital house ghost.
