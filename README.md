> 🌐 **Language / Sprache:** &nbsp; 🇬🇧 [English](README.md) &nbsp;|&nbsp; 🇩🇪 [Deutsch](README_DE.md)

# Smart Home Dashboard v3 · Neo Deck 🏠👻

![Dashboard Preview](preview.png)

A modern, highly customizable smart home wall panel for tablets (optimized for a **Lenovo Tab M10 FHD Plus (10.3", 1920×1200, 16:10)** in landscape mode). Designed for 24/7 continuous operation inside the **Fully Kiosk Browser**.

---

## ⚡ Quick Start (One-Liner Installation)

The fastest method to set up the dashboard. The installer automatically checks all dependencies (Node.js, Git, npm) on your system and installs any missing components.

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
*Performs a local host installation including automatic systemd service configuration for launching on boot.*

---

## ✨ Highlights & Features

- **Multi-Theme System:** 6 elegant, switchable premium designs (Neo-Aurora Glassmorphism, Cyberpunk Tactical HUD, Cozy Nordic Dark, Retrowave Laser Synth, Terminal Classic, and OLED Stealth) with persistent storage.
- **Adaptive Widgets:** Layout adapts dynamically to aspect ratio and Fully Kiosk viewport to prevent cut-off content.
- **Weather Pro:** Open-Meteo integration containing temperature, feels-like temperature, min/max, humidity, rain probability, wind speed, air pressure, cloud cover, and UV index (no API key required).
- **Smart Home / Tasmota:** Local device management, private subnet scan, toggle buttons with status indicators, and offline dimming.
- **AM2301 Climate Sensor:** Custom Tasmota sensor widget with temperature/humidity gauges and dew point.
- **Waste Calendar:** `.ics` upload, upcoming pick-ups, colored trash bin icons, and calendar-day precise Today/Tomorrow display.
- **Interactive Calendar:** Manual appointment entries via in-app modal form, live WebSocket sync across dashboards, automated client-side reminders (visual alerts, sound beeps, speech synthesis), and J.A.R.V.I.S. integration.
- **J.A.R.V.I.S. AI Assistant:** Integrated voice and text input widget featuring an animated Arc Reactor / Orbital visualizer, persistent chat history, provider configuration (Gemini 3.5 Flash by default, OpenRouter), and custom system prompts.
- **Smart-Home Timer:** Circular progress timer (hours, minutes, seconds selectable via 3D scroll picker wheels) with presets, loop alarm sound (gong, bell, etc.), real-time Multi-Client WebSocket sync, and server-side state persistence (for standby client sync).
- **Key Status Indicators:** Visual glowing status dots (🟢/🔴) in settings for instant feedback on active API keys, along with dedicated delete buttons for ElevenLabs and Brave Search keys.
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
