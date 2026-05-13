# Smart Home Dashboard (Touch / Fully Kiosk Optimized)

A high-performance, modern "Apple/Tesla-Style" Smart Home Dashboard specifically built for wall-mounted 10-inch Android Tablets using **Fully Kiosk Browser**. The backend runs on Node.js.

![Dashboard Preview](https://via.placeholder.com/1000x500.png?text=Smart+Home+Dashboard)

## ✨ Features

- 📱 **Perfect Touch Drag & Drop**: Unlike standard HTML5, this uses *Sortable.js* with delayed input, allowing flawless widget dragging on Touch-Displays inside Fully Kiosk.
- 🎨 **Glassmorphism UI**: High-end look with floating background orbs, blur effects (`backdrop-filter`), and `Outfit` typography.
- 🔌 **Tasmota Native**: Built-in Network-Scanner for 192.168.x.x devices. Rapidly toggles devices, displays green glowing buttons when active.
- 📻 **Media Streamer**: Live Webplayer integrated using `HLS.js` – supports traditional MP3 streams or even `.m3u8` feeds (Radio, IP-Cams).
- 🗑️ **Waste Calendar**: Self-parsing `.ics` (iCalendar) calendar. Automatically filters past dates and predicts future waste pickups via colored trashcan icons.
- 🌤️ **Live Weather**: Uses Open-Meteo & Geolocation API. Displays Humidity, Windspeed, and Min/Max Temps.
- 📊 **Server System Status**: Fully animated, multi-colored Bargraph monitoring your Server's CPU, RAM, Temp and Network via WebSockets in real-time.
- ⚙️ **Accordion Settings**: Extremely clean Setup-Menu. Features on-the-fly toggles to instantly hide/show widgets on the board. State remembers in `localStorage`.

## 🚀 Installation

Ensure you have [Node.js](https://nodejs.org/) installed.

```bash
# Clone this repository
git clone https://github.com/YOUR_GITHUB_USERNAME/smart-home-dashboard.git

# Enter folder
cd smart-home-dashboard

# Install dependencies
npm install

# Start the server (runs on Port 8443)
npm start
```

## 📐 Layout Details

The screen utilizes a responsive CSS Grid system setup for exactly **3x3 Widgets**. Perfect for 16:10 resolutions (e.g. 1920x1200 or mapped 1280x800). Simply browse to `http://<SERVER-IP>:8443` on your tablet.

## 💾 Storage

- **Tasmota Devices:** Backed up securely inside `tasmota.json`.
- **User Configs:** Preferred layouts, location strings, and stream URLs are kept local on the Tablet's Web-Storage.
- **ICS Calendars:** Stored inside the `/uploads` directory.

## 🛠 Required Core

- `express` (Webserver)
- `socket.io` (Realtime Updates / WebSockets)
- `systeminformation` (Telemetry mapping) 
- `multer` (Upload handling)

---
*Created by Neo & Steffen*
