# Walkthrough - Universal PTZ Controls & Thingino Native Motor Integration (v3.21.24)

This release implements universal camera control supporting both standard ONVIF PTZ (Profile S) and native Thingino open-source step motor control directly from the SmartHome Dashboard UI.

---

## 🛠️ Key Improvements in v3.21.24

### 1. Universal PTZ Routing (`src/routes/cameras.js`)
* **Dual PTZ Engine:** The backend now seamlessly detects whether a camera uses standard ONVIF protocol (e.g. port 2020 on stock Tapo) or native HTTP step motor commands (Thingino on port 80).
* **Automatic Fallback:** When a directional PTZ command (`up`, `down`, `left`, `right`) is triggered from the UI, the system executes the command reliably across all camera types.

### 2. Direct Thingino Native MJPEG Stream Support
* Native MJPEG streaming from Thingino (`/x/ch0.mjpg`) without requiring external RTSP transcoders or go2rtc proxy overhead.

### 3. Frontend Controls
* Sleek, frosted-glass circular D-pad overlay on fullscreen camera feeds.
* Added camera IP configuration input to route PTZ commands directly even when video streams are proxied.

---

## 🏷️ Release v3.21.24 Info
* **Bumped Version:** `3.21.24` in `package.json` and `public/index.html`.
* **Tested & Verified:** Live on Debian server (`192.168.178.101`) with physical Tapo C200 (Thingino) and Tapo TC60.
