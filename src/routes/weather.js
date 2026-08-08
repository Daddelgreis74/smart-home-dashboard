const express = require('express');
const fs = require('fs');
const { CONFIG_FILE } = require('../config/env');
const { safeWriteFileSync } = require('../utils/fileStore');

const router = express.Router();

// Wetter-Cache im Arbeitsspeicher (RAM)
let weatherCache = null;
let weatherCacheTime = 0;
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 Minuten

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('[Weather] Fehler beim Laden von config.json:', e.message);
  }
  return {};
}

function saveConfig(cfg) {
  try {
    safeWriteFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2));
  } catch (e) {
    console.error('[Weather] Fehler beim Speichern von config.json:', e.message);
  }
}

// Hilfsfunktion zum Abrufen von externen URLs via nativem fetch
async function fetchJson(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'smart-home-dashboard' } });
  if (!res.ok) {
    throw new Error(`HTTP Error: ${res.status}`);
  }
  return res.json();
}

router.get('/', async (req, res) => {
  const now = Date.now();
  
  // 1. Verwende RAM-Cache falls gültig
  if (weatherCache && (now - weatherCacheTime) < CACHE_TTL_MS) {
    return res.json(weatherCache);
  }

  const cfg = loadConfig();
  let locName = cfg.weather_location || 'Berlin';
  const provider = cfg.weather_provider || 'openmeteo';
  const apiKey = cfg.weather_api_key || '';
  const lang = cfg.dashboard_lang || 'de';

  let lat = parseFloat(cfg.weather_lat);
  let lon = parseFloat(cfg.weather_lon);
  let cachedLoc = cfg.weather_loc_resolved;

  // Wenn der konfigurierte Ort sich vom gecachten aufgelösten Ort unterscheidet,
  // müssen wir den alten Koordinaten-Cache ungültig machen
  if (cachedLoc !== locName) {
    lat = null;
    lon = null;
    cachedLoc = null;
    delete cfg.weather_lat;
    delete cfg.weather_lon;
    delete cfg.weather_loc_resolved;
    saveConfig(cfg);
  }

  // 2. Geocoding durchführen bei Open-Meteo, falls Koordinaten fehlen
  if (provider === 'openmeteo' && (!lat || !lon)) {
    try {
      console.log(`[Weather] Führe Geocoding für "${locName}" aus...`);
      const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(locName)}&count=1&language=${lang}&format=json`;
      const geoRes = await fetchJson(geoUrl);
      if (geoRes.results && geoRes.results.length > 0) {
        lat = geoRes.results[0].latitude;
        lon = geoRes.results[0].longitude;
        locName = geoRes.results[0].name;

        // Speicher aufgelöste Koordinaten in der Config, um Limits zu schonen
        cfg.weather_lat = lat;
        cfg.weather_lon = lon;
        cfg.weather_loc_resolved = locName;
        saveConfig(cfg);
      }
    } catch (e) {
      console.warn('[Weather Warning] Geocoding fehlgeschlagen, nutze Fallback-Koordinaten:', e.message);
      if (!lat) { lat = 52.52; lon = 13.41; } // Fallback Berlin
    }
  } else if (provider === 'openmeteo') {
    locName = cachedLoc || locName;
  }

  let weatherData = null;
  let success = false;

  // 3. Wetterdaten vom Provider laden
  if (provider === 'weatherapi' && apiKey) {
    try {
      console.log(`[Weather] Lade Daten von WeatherAPI für "${locName}"...`);
      const query = (lat && lon) ? `${lat},${lon}` : locName;
      const weatherUrl = `https://api.weatherapi.com/v1/forecast.json?key=${apiKey}&q=${encodeURIComponent(query)}&days=1&aqi=no&alerts=no&lang=${lang}`;
      const rawData = await fetchJson(weatherUrl);
      if (rawData && rawData.current) {
        const forecastday = rawData.forecast?.forecastday?.[0];
        const precipProb = forecastday?.day?.daily_chance_of_rain ?? 0;
        
        weatherData = {
          current: {
            temperature_2m: rawData.current.temp_c,
            relative_humidity_2m: rawData.current.humidity,
            apparent_temperature: rawData.current.feelslike_c,
            weather_code: rawData.current.condition.code,
            wind_speed_10m: rawData.current.wind_kph,
            precipitation: rawData.current.precip_mm,
            pressure_msl: rawData.current.pressure_mb,
            cloud_cover: rawData.current.cloud,
            is_weather_api: true,
            condition_text: rawData.current.condition.text
          },
          daily: {
            temperature_2m_max: [forecastday?.day?.maxtemp_c ?? rawData.current.temp_c],
            temperature_2m_min: [forecastday?.day?.mintemp_c ?? rawData.current.temp_c],
            uv_index_max: [forecastday?.day?.uv ?? rawData.current.uv],
            precipitation_probability_max: [precipProb]
          },
          resolved_location: rawData.location.name
        };

        // Cache Koordinaten und aufgelösten Ort von WeatherAPI ebenfalls
        cfg.weather_lat = rawData.location.lat;
        cfg.weather_lon = rawData.location.lon;
        cfg.weather_loc_resolved = rawData.location.name;
        saveConfig(cfg);

        success = true;
      }
    } catch (e) {
      console.error('[Weather Error] WeatherAPI Abfrage fehlgeschlagen:', e.message);
    }
  }

  // 4. Fallback auf Open-Meteo, falls WeatherAPI nicht gewählt wurde oder fehlgeschlagen ist
  if (!success) {
    try {
      console.log(`[Weather] Lade Daten von Open-Meteo für "${locName}" (lat=${lat}, lon=${lon})...`);
      if (!lat) { lat = 52.52; lon = 13.41; }
      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
        `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_gusts_10m,precipitation,rain,pressure_msl,cloud_cover` +
        `&daily=temperature_2m_max,temperature_2m_min,uv_index_max,precipitation_probability_max,sunrise,sunset` +
        `&timezone=auto`;
      const rawData = await fetchJson(weatherUrl);
      if (rawData && rawData.current) {
        weatherData = {
          ...rawData,
          resolved_location: locName
        };
        success = true;
      }
    } catch (e) {
      console.error('[Weather Error] Open-Meteo Abfrage fehlgeschlagen:', e.message);
    }
  }

  // 5. Cache befüllen und Daten zurückgeben
  if (success && weatherData) {
    weatherCache = weatherData;
    weatherCacheTime = now;
    return res.json(weatherCache);
  } else if (weatherCache) {
    // Liefert veralteten Cache bei API-Ausfällen als Notfall-Fallback
    console.warn('[Weather Warning] Liefere veraltete Wetterdaten aus Cache wegen API-Ausfall.');
    return res.json(weatherCache);
  }

  res.status(502).json({ success: false, error: 'Wetterdaten konnten nicht abgerufen werden' });
});

// Cache löschen (z. B. nach Einstellungsänderung)
router.post('/clear-cache', (req, res) => {
  weatherCache = null;
  weatherCacheTime = 0;
  console.log('[Weather] Cache wurde zurückgesetzt.');
  res.json({ success: true });
});

router.post('/test', async (req, res) => {
  let { location } = req.body;
  if (!location) {
    return res.status(400).json({ success: false, error: 'Ort fehlt' });
  }

  location = String(location).trim();


  // 2. Clean up German state abbreviations and names to avoid geocoding issues
  let targetState = null;
  const words = location.split(/\s+/);
  if (words.length > 1) {
    const lastWord = words[words.length - 1].toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "");
    
    // Map of German state abbreviations to regexes or names
    const STATE_RESOLVER = {
      'th': /thüringen|thuringia/i,
      'thür': /thüringen|thuringia/i,
      'thüringen': /thüringen|thuringia/i,
      'by': /bayern|bavaria/i,
      'bay': /bayern|bavaria/i,
      'bayern': /bayern|bavaria/i,
      'nrw': /nordrhein-westfalen|north rhine/i,
      'nw': /nordrhein-westfalen|north rhine/i,
      'nordrhein-westfalen': /nordrhein-westfalen|north rhine/i,
      'sn': /sachsen|saxony/i,
      'sachs': /sachsen|saxony/i,
      'sachsen': /sachsen|saxony/i,
      'he': /hessen|hesse/i,
      'hessen': /hessen|hesse/i,
      'bw': /baden-württemberg|baden/i,
      'baden-württemberg': /baden-württemberg|baden/i,
      'rp': /rheinland-pfalz|rhineland/i,
      'rlp': /rheinland-pfalz|rhineland/i,
      'rheinland-pfalz': /rheinland-pfalz|rhineland/i,
      'sl': /saarland/i,
      'saarland': /saarland/i,
      'sh': /schleswig-holstein|schleswig/i,
      'schleswig-holstein': /schleswig-holstein|schleswig/i,
      'mv': /mecklenburg-vorpommern|mecklenburg/i,
      'mvp': /mecklenburg-vorpommern|mecklenburg/i,
      'mecklenburg-vorpommern': /mecklenburg-vorpommern|mecklenburg/i,
      'hh': /hamburg/i,
      'hamburg': /hamburg/i,
      'hb': /bremen/i,
      'bremen': /bremen/i,
      'be': /berlin/i,
      'berlin': /berlin/i,
      'bb': /brandenburg/i,
      'brandenburg': /brandenburg/i,
      'st': /sachsen-anhalt|saxony-anhalt/i,
      'sachsen-anhalt': /sachsen-anhalt|saxony-anhalt/i,
      'ni': /niedersachsen|lower saxony/i,
      'niedersachsen': /niedersachsen|lower saxony/i
    };

    if (STATE_RESOLVER[lastWord]) {
      targetState = STATE_RESOLVER[lastWord];
      words.pop();
      location = words.join(' ');
      console.log(`[Weather Test] State-Filter erkannt: ${lastWord}, Suche nach: "${location}"`);
    }
  }

  try {
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=10&language=de&format=json`;
    const geoRes = await fetchJson(geoUrl);
    if (geoRes.results && geoRes.results.length > 0) {
      let result = geoRes.results[0]; // Default to first

      // If we have a target state filter, find the matching result
      if (targetState) {
        const matched = geoRes.results.find(res => 
          (res.admin1 && targetState.test(res.admin1)) || 
          (res.admin2 && targetState.test(res.admin2)) ||
          (res.admin3 && targetState.test(res.admin3)) ||
          (res.admin4 && targetState.test(res.admin4))
        );
        if (matched) {
          result = matched;
          console.log(`[Weather Test] Passenden Ort für State-Filter gefunden: "${result.name}" (${result.admin1}, ${result.country})`);
        } else {
          console.log(`[Weather Test] Kein genauer Treffer für State-Filter, nehme ersten Eintrag: "${result.name}" (${result.admin1}, ${result.country})`);
        }
      }

      return res.json({
        success: true,
        resolvedLocation: result.name,
        country: result.country || '',
        admin1: result.admin1 || '',
        lat: result.latitude,
        lon: result.longitude
      });
    } else {
      return res.json({ success: false, error: 'Ort konnte nicht gefunden werden' });
    }
  } catch (err) {
    console.error('[Weather Test Error]', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
