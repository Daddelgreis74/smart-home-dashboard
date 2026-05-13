# Smart Home Dashboard v2 🏠👻

![Dashboard Vorschau](preview.png)

Ein hochmodernes, responsives Smart Home Dashboard, speziell optimiert für die ständige Anzeige auf einem **Lenovo Tab M10 FHD Plus (10.3", 1920x1200)** im Querformat (Nutzung mit *Fully Kiosk Browser*).

## 🌟 Features

* **Wetter & Standort:** Lokale Wetterdaten über die Open-Meteo API (ohne API-Keys) inkl. Temperatur, Wind und Feuchtigkeit.
* **Smart Home Steuerung (Tasmota):** Node.js fragt eigenständig das Heimnetzwerk (`192.168.178.x`) ab, schaltet Geräte und speichert den Status persistent ab.
* **Abfallkalender:** Automatisches Auslesen von `.ics`-Dateien für die nächsten Abholungen inkl. farbig passender Mülltonnensymbole (Bio, Papier, etc.).
* **Live Radio:** Integrierter HLS.js Player für Live-Radiostreams (`.m3u8`) inkl. Lautstärkeregler und optischem Equalizer.
* **System Status:** Live-Bargraphen für den Server (CPU, RAM, Temperatur, Netzwerk) in LED-Optik, abgerufen über `systeminformation`.
* **Touch & Drag & Drop:** Die Kacheln lassen sich frei anordnen. Voll Kiosk-Touch-kompatibel (via `Sortable.js`).

## 🛠️ Architektur & Design

* **Stack:** Node.js, Express.js, Socket.IO
* **Design:** Apple/Tesla-UI inspiriert, Glasmorphismus, fließende Hintergrund-Orbs im Dark-Mode und abgerundete Kanten.
* **Typografie:** Google Font *Outfit* für klare und moderne Lesbarkeit aus der Ferne.

## 🚀 Betrieb

Das Backend läuft als systemd-Service (`smart-home-dashboard.service`) und ist standardmäßig über Port **8443** erreichbar.

```bash
# Abhängigkeiten installieren
npm install

# Server starten
node server.js
```

---
*Mit 👻 entwickelt von Neo, dem digitalen Hausgeist.*
