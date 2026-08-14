# Walkthrough - Tapo Camera ONVIF & go2rtc Transcoding Integration (v3.21.23)

This release implements standard ONVIF PTZ (Pan-Tilt-Zoom) controls for cameras directly in the dashboard UI and optimizes go2rtc transcoding for hardware-accelerated video feeds.

---

## 🛠️ Changes Implemented

### 1. Dashboard Backend (`src/routes/cameras.js`)
* Extended `POST /api/cameras` to persist ONVIF PTZ parameters (`ptz`, `ptzHost`, `ptzPort`, `ptzUser`, `ptzPass`).
* Added `POST /api/cameras/ptz/:id` endpoint which utilizes `node-onvif` to connect directly to the camera and send pan/tilt movement commands.
* Extracted the correct camera IP address (`ptzHost` or `url.hostname`) to ensure command routing works perfectly even when proxying the stream via go2rtc.

### 2. Validation System (`src/utils/validation.js`)
* Updated `sanitizeCameras` to correctly preserve the new ONVIF-related fields, preventing the storage mechanism from stripping them out during loading or saving operations.

### 3. Frontend UI (`public/index.html` & `public/styles.css`)
* Added *"ONVIF PTZ-Steuerung aktivieren"* toggle and credentials input fields to the camera settings form.
* Created a sleek, frosted-glass D-pad overlay (`.ptz-controls-overlay`) that is dynamically displayed inside the fullscreen view of any camera with PTZ enabled.

### 4. Client Module Logic (`public/js/modules/cameras.js`)
* Updated the camera addition logic to extract and send all ONVIF parameters.
* Added event listeners to D-pad buttons (Up, Down, Left, Right) to trigger PTZ movements in the background.

### 5. Translation Keys (`public/translations.js`)
* Added full translation strings for all 7 supported languages.

---

## 🎥 go2rtc Transcoding Configuration on TrueNAS (`192.168.178.100`)
To support MJPEG streaming on the dashboard without loading the camera's CPU, the streams are transcoded on-the-fly inside `go2rtc` on TrueNAS:

```yaml
streams:
  tapo_tc60_h264: rtsp://daddelgreis74:Steffen.Gester811@192.168.178.30:554/stream1#transport=tcp
  tapo_tc60: ffmpeg:tapo_tc60_h264#video=mjpeg

  tapo_c200_h264: rtsp://daddelgreis74:Steffen.Gester811@192.168.178.42:554/stream1#transport=tcp
  tapo_c200: ffmpeg:tapo_c200_h264#video=mjpeg
```

---

## 🏷️ Release v3.21.23 Info
* **Bumped Version:** `3.21.23` in `package.json` and `public/index.html`.
* **Deployed to Debian Server:** `192.168.178.101` (Service is active and running).
