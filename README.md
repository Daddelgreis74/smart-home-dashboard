> 🌐 **Language / Sprache:** &nbsp; 🇬🇧 [English](README.md) &nbsp;|&nbsp; 🇩🇪 [Deutsch](README_DE.md)

# Smart Home Dashboard v3 · Neo Deck 🏠👻

![Dashboard Preview](preview.png)

A modern, highly customizable smart home wall panel for tablets (optimized for a **Lenovo Tab M10 FHD Plus (10.3", 1920×1200, 16:10)** in landscape mode). Designed for 24/7 continuous operation inside the **Fully Kiosk Browser**.

---

## ⚡ Quick Start (One-Liner Installation)

The fastest method to set up the dashboard. The installer automatically checks all dependencies (Node.js, Git, npm, and optionally Docker) on your system and installs any missing components.

### 💻 Windows (PowerShell)
Open PowerShell and run the following command:
```powershell
irm https://raw.githubusercontent.com/Daddelgreis74/smart-home-dashboard/main/install.ps1 | iex
```
*Missing dependencies (like Git or Node.js) are automatically installed using the Windows Package Manager (`winget`). A desktop shortcut can optionally be created.*

### 🐧 Linux / Raspberry Pi (Bash)
Open your terminal and run the following command:
```bash
bash <(curl -fsSL https://raw.githubusercontent.com/Daddelgreis74/smart-home-dashboard/main/install.sh)
```
*Offers the choice between a local host installation (including automatic systemd service configuration for launching on boot) or a Docker Compose deployment.*

---

## ✨ Highlights & Features

- **Multi-Theme System:** 6 elegant, switchable premium designs (Neo-Aurora Glassmorphism, Cyberpunk Tactical HUD, Cozy Nordic Dark, Retrowave Laser Synth, Terminal Classic, and OLED Stealth) with persistent storage.
- **Adaptive Widgets:** Layout adapts dynamically to aspect ratio and Fully Kiosk viewport to prevent cut-off content.
- **Weather Pro:** Open-Meteo integration containing temperature, feels-like temperature, min/max, humidity, rain probability, wind speed, air pressure, cloud cover, and UV index (no API key required).
- **Smart Home / Tasmota:** Local device management, private subnet scan, toggle buttons with status indicators, and offline dimming.
- **AM2301 Climate Sensor:** Custom Tasmota sensor widget with temperature/humidity gauges and dew point.
- **Waste Calendar:** `.ics` upload, upcoming pick-ups, colored trash bin icons, and calendar-day precise Today/Tomorrow display.
- **Interactive Calendar:** Manual appointment entries via in-app modal form, live WebSocket sync across dashboards, automated client-side reminders (visual alerts, sound beeps, speech synthesis), and full J.A.R.V.I.S. integration (voice commands to add/query combined waste + personal events).
- **J.A.R.V.I.S. AI Assistant:** Integrated voice and text input widget featuring an animated Arc Reactor / Orbital visualizer (audio visualizer for TTS/Listening states), persistent chat history, configurable LLM providers (Gemini, OpenRouter, custom API), and custom system prompts.
- **Live Radio:** Preset buttons, integrated station management in preferences, and HLS/MP3/AAC support with autostart protection on tablet wakeup.
- **System Status:** Live CPU, RAM, temperature, and network stats via Socket.IO.
- **Fritz!Box Monitor:** Live latency and connection status (LEDs) and a real-time call monitor (port 1012) with full-screen live caller popup overlay and call history list.
- **Multi-Language Support (i18n):** Complete client-side UI translations for 🇩🇪 German, 🇬🇧 English, 🇫🇷 French, 🇪🇸 Spanish, 🇮🇹 Italian, 🇳🇱 Dutch, and 🇵🇱 Polish.

---

## 🎨 Dashboard Themes

You can switch the dashboard theme directly inside the settings gear menu (top right):

| Theme | Preview |
| :--- | :--- |
| **Neo-Aurora**<br>Transparent frosted-glass cards with soft ambient auras and glowing widgets. | ![Neo-Aurora](public/themes/neo_aurora.png) |
| **Cyberpunk HUD**<br>Tactical high-tech look in orange/amber with sharp corners and grid background. | ![Cyberpunk HUD](public/themes/cyberpunk_hud.png) |
| **Cozy Nordic Dark**<br>Calming, organic aesthetic with sage green accents and soft shadows. | ![Cozy Nordic Dark](public/themes/nordic_dark.png) |
| **Retrowave Laser Synth**<br>Nostalgic 80s retro look in pink/cyan with a perspective laser floor grid. | ![Retrowave Laser Synth](public/themes/retrowave_synth.png) |

---

## 🛠️ Manual Installation

If you prefer not to use the automated One-Liner scripts, you can set up the application manually:

### Windows
1. Download this repository as a ZIP file (or clone it) and extract it.
2. Double-click the file in the project root:
   ```text
   start-dashboard.bat
   ```
   *This batch file checks your paths, installs dependencies if missing (`npm install`), opens the browser, and starts the server.*

### Linux & macOS
1. Clone the repository and navigate to the directory:
   ```bash
   git clone https://github.com/Daddelgreis74/smart-home-dashboard.git
   cd smart-home-dashboard
   ```
2. Install dependencies and start the app:
   ```bash
   npm install
   npm start
   ```
   By default, the manual server runs on `http://localhost:8443` (or `https://localhost:8443` with SSL).

---

## 🐋 Docker & TrueNAS Setup Guide

This project is fully containerized. All settings, uploaded calendar files (`calendar.ics`), web radio streams, Fritz!Box connections, camera feeds, and call lists are persisted in a single mount volume. This makes running it on **TrueNAS SCALE** or any other Docker host extremely simple.

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

---

### 🛠️ Method 2: Docker Compose (CLI & SSH)

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Daddelgreis74/smart-home-dashboard.git
   cd smart-home-dashboard
   ```
2. **Start the container in the background:**
   ```bash
   docker compose up -d --build
   ```
   The dashboard is instantly accessible at `http://<YOUR-SERVER-IP>:8443`!

---

### 📝 Method 3: TrueNAS Custom App (GUI Installation)

If you wish to manually install the dashboard as a Custom App using the TrueNAS Web UI, follow these steps:

#### Step 1: Prepare the Dataset & Permissions
The container runs as user `568:568` (TrueNAS `apps` user). Set the correct host folder permissions first.

Replace `/mnt/your-pool/your-dataset/smart-home-dashboard` with your actual TrueNAS dataset path:
```bash
mkdir -p /mnt/your-pool/your-dataset/smart-home-dashboard
chown -R 568:568 /mnt/your-pool/your-dataset/smart-home-dashboard
chmod -R 770 /mnt/your-pool/your-dataset/smart-home-dashboard
```

#### Step 2: Install via TrueNAS Web Interface
1. Go to **Apps** ➡️ **Discover Apps** ➡️ **Custom App** (top right).
2. Configure the following fields:
   * **Application Name:** `smart-home-dashboard`
   * **Repository:** `ghcr.io/daddelgreis74/smart-home-dashboard`
   * **Tag:** `3.9.8` *(or `latest`)*
3. **Network Configuration (Crucial for network stats):**
   * **Recommended:** Enable the **Host Network** checkbox. This allows the container to share the network stack with the TrueNAS host, enabling the System Status widget on your dashboard to measure the actual network speed of your server.
   * *Note with Host Network:* The app will listen directly on port `8443` of your TrueNAS host. Access it via `http://<YOUR-TRUENAS-IP>:8443`.
   * *Alternative (Bridge):* If you prefer not to use host networking, keep the checkbox disabled, add port forwarding, and map host port `30436` to container port `8443`. (Note: Network speed stats in the dashboard will remain at `0.00 MB/s` in this mode).
4. **Storage Configuration:**
   * Add a **Host Path Volume**:
     * **Host Path:** `/mnt/your-pool/your-dataset/smart-home-dashboard` (Your previously created path)
     * **Mount Path:** `/app/data`
5. Click **Save** at the bottom of the page – done! TrueNAS will pull the image and deploy the dashboard.

---

## ⚙️ Advanced Configuration

### 🌐 Environment Variables

The application can be configured using the following environment variables:

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `PORT` | `8443` | The primary port of the dashboard web server (HTTPS if SSL certificates exist, otherwise HTTP). |
| `HOST` | `0.0.0.0` | The IP address interface the server binds to. |
| `DATA_DIR` | (App directory) | Path to the directory where configs (`tasmota.json`, etc.) are saved. |
| `UPLOAD_DIR` | `DATA_DIR/uploads` | Path to the directory where uploaded `.ics` files are saved. |
| `SSL_DIR` | `DATA_DIR/ssl` | Path to the directory containing SSL/TLS certificates (`key.pem` and `cert.pem`). |
| `AUTO_SSL` | `false` | Set to `true` to automatically generate a self-signed SSL/TLS certificate if missing in `SSL_DIR`. |

#### 🐳 Docker Port-Mapping Example
When deploying the dashboard, it is recommended to map the HTTPS port:
* **Port 8443 (HTTPS):** Map host port (e.g. `8443` or `30436`) to container port `8443` for secure HTTPS access (required for microphone access).

### 📞 Fritz!Box Monitor & Call Monitor Setup
- **Connection:** Your Fritz!Box credentials and call logs are stored **locally** on your host inside `fritzbox.json` and `fritzbox_calls.json`. These files are ignored by Git and never uploaded.
- **Enabling the Call Monitor:** To allow the live call monitor on port 1012, you must enable it on your Fritz!Box by dialing the following code on a connected phone:
  * **Enable:** `#96*5*` (and dial/call)
  * **Disable (optional):** `#96*6*`

### 🌡️ AM2301/Tasmota Climate Sensor
The sensor widget queries a local Tasmota endpoint:
`GET /api/tasmota/sensor?ip=192.168.178.40`
The IP can be configured in the Preferences menu (top right). The backend only accepts private IPv4 addresses.

### 🗓️ Waste Calendar Date Logic
All-day `.ics` events are compared using local calendar days. This ensures that tomorrow's pick-up is not incorrectly displayed as "Today" just because the current time is past `00:00`.

---

## 🔐 Security & Local Files

The following files contain private configurations and are **never uploaded to GitHub** (protected via `.gitignore`):
- `appointments.json`, `data/`, `www/`, `radio.json`, `tasmota.json`, `fritzbox.json`, `fritzbox_calls.json`, `presence.json`, `uploads/`, `node_modules/`, `ssl/`

---

## 🧪 Verification & Checks
You can manually check the files for syntax errors using the following commands:
```bash
node --check server.js
node --check public/app.js
npm audit --omit=dev
```

---
Developed with 👻 by **Neo**, the digital house ghost.
