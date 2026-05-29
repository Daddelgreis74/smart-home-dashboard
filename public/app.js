const socket = io();
let hlsCore = null;
let isPlaying = false;
let tasmotaDevices = [];

function applyTheme(themeClass) {
  document.body.classList.remove('theme-aurora', 'theme-cyberpunk', 'theme-nordic', 'theme-retrowave');
  document.body.classList.add(themeClass);
  localStorage.setItem('dashboard_theme', themeClass);
}

document.addEventListener('DOMContentLoaded', () => {
  init();
});

function init() {
  loadSavedSettings();
  updateDateTime();
  setInterval(updateDateTime, 1000);
  initSettings();
  
  // Sortable.js (Tablet/Touch Ready) Initialisierung
  initSortable(); 
  
  loadWeather();
  setInterval(loadWeather, 15 * 60 * 1000); // Automatisches Hintergrund-Wetter-Update alle 15 Minuten
  loadICS();
  setInterval(loadICS, 60 * 60 * 1000); // Automatisches Hintergrund-Abfallkalender-Update jede Stunde
  initRadioWidget();
  initFritzRadioPopup();
  initAudioPlayer();
  initRadioWakeGuards();
  initSensorWidget();
  initSystemBargraph();
  initTasmota();
  initFritzbox();
  initPresence();
  initCameraWidget();
}

// FRITZ!Box Radio State and UI handlers will be defined below

function initSortable() {
  const dashboard = document.getElementById('dashboard');
  if(!window.Sortable) return;
  
  Sortable.create(dashboard, {
    handle: '.drag-handle', // Drag handle is the 3 dots
    animation: 250,
    ghostClass: 'sortable-ghost',
    delay: 150, // WICHTIG FÜR ANDROID/FULLY: 150ms gedrückt halten startet das Drag! Verhindert Konflikte mit Scrollen.
    delayOnTouchOnly: true, // Delay nur auf Touch-Geräten
    fallbackTolerance: 5, // Verhindert Abbrüche beim minimalsten Finger-Zittern
    onEnd: function () {
      saveLayout();
    }
  });
}

function loadSavedSettings() {
  // Farbthema laden und anwenden
  const savedTheme = localStorage.getItem('dashboard_theme') || 'theme-aurora';
  applyTheme(savedTheme);
  const themeSelector = document.getElementById('themeSelector');
  if (themeSelector) themeSelector.value = savedTheme;

  const savedLoc = localStorage.getItem('weatherLoc');
  if (savedLoc) document.getElementById('weatherLoc').value = savedLoc;

  const savedProvider = localStorage.getItem('weather_provider') || 'openmeteo';
  const providerSelector = document.getElementById('weatherProvider');
  if (providerSelector) {
    providerSelector.value = savedProvider;
    const apiKeyGroup = document.getElementById('weatherApiKeyGroup');
    if (apiKeyGroup) {
      apiKeyGroup.style.display = (savedProvider === 'weatherapi') ? 'block' : 'none';
    }
  }

  const savedKey = localStorage.getItem('weather_api_key') || '';
  const apiKeyInput = document.getElementById('weatherApiKey');
  if (apiKeyInput) apiKeyInput.value = savedKey;
  
  const savedStream = localStorage.getItem('streamUrl');
  if (savedStream) {
    const streamInput = document.getElementById('streamUrl');
    if (streamInput) streamInput.value = savedStream;
    
    // Voll-Stille sicherstellen, keine alten Timer oder Eventhänger
    if(activeAudioElement) {
        activeAudioElement.pause();
        activeAudioElement.src = '';
        activeAudioElement = null;
    }
  }

  // Wende Layout aus dem Socket Layer oder lokalen Storage an (einfachheitshalber Client-Side Render Order)
  const savedLayout = JSON.parse(localStorage.getItem('widgetLayout') || '[]');
  if(savedLayout && savedLayout.length > 0) {
    const dashboard = document.getElementById('dashboard');
    savedLayout.forEach(type => {
      const widget = dashboard.querySelector(`.widget[data-type="${type}"]`);
      if(widget) dashboard.appendChild(widget);
    });
  }

  const savedSensorIp = localStorage.getItem('sensorIp') || '192.168.178.40';
  const sensorIpInput = document.getElementById('sensorIp');
  if(sensorIpInput) sensorIpInput.value = savedSensorIp;

  ['weather', 'waste', 'player', 'sensor', 'system', 'tasmota', 'fritzbox', 'presence', 'camera'].forEach(type => {
    const isVisible = localStorage.getItem('show_' + type) !== 'false';
    const widget = document.querySelector(`.widget[data-type="${type}"]`);
    const toggle = document.getElementById('toggle-' + type);
    
    if (toggle) toggle.checked = isVisible;
    if (widget) {
      if (isVisible) { widget.classList.remove('hidden'); widget.style.display = ''; }
      else { widget.classList.add('hidden'); widget.style.display = 'none'; }
    }
  });
}

function saveLayout() {
  const widgets = document.querySelectorAll('.widget');
  const layout = Array.from(widgets).map(w => w.dataset.type);
  localStorage.setItem('widgetLayout', JSON.stringify(layout)); // Speichere im Browser
  socket.emit('update-layout', layout); // Opt. an andere Clients broadcasten
}

socket.on('layout-updated', (layout) => {
  const dashboard = document.getElementById('dashboard');
  layout.forEach(type => {
    const w = dashboard.querySelector(`.widget[data-type="${type}"]`);
    if(w) dashboard.appendChild(w);
  });
});

function updateDateTime() {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
  const hTime = document.getElementById('headerTime'); const hDate = document.getElementById('headerDate');
  if(hTime) hTime.innerHTML = timeStr; if(hDate) hDate.innerHTML = dateStr;
}

function initSettings() {
  initAccordion();

  // Farbthema Selector Event Listener
  const themeSelector = document.getElementById('themeSelector');
  if (themeSelector) {
    themeSelector.addEventListener('change', (e) => {
      applyTheme(e.target.value);
    });
  }

  document.getElementById('settingsBtn').addEventListener('click', () => {
    // Alle Akkordeons beim Öffnen schließen
    const headers = document.querySelectorAll('.accordion-header');
    headers.forEach(h => {
      h.classList.remove('active');
      if (h.nextElementSibling) h.nextElementSibling.classList.remove('active-body');
    });
    document.getElementById('settingsOverlay').classList.add('open');
  });
  document.getElementById('closeSettings').addEventListener('click', () => {
    document.getElementById('settingsOverlay').classList.remove('open');
  });

  document.getElementById('uploadIcs').addEventListener('click', () => {
    const file = document.getElementById('icsFile').files[0];
    if (file) {
      const formData = new FormData(); formData.append('icsFile', file);
      fetch('/api/upload-ics', { method: 'POST', body: formData })
        .then(r => r.json()).then(d => { if(d.success) { loadICS(); alert('Abfallkalender aktualisiert.'); } });
    }
  });

  const weatherProviderSelector = document.getElementById('weatherProvider');
  if (weatherProviderSelector) {
    weatherProviderSelector.addEventListener('change', (e) => {
      const apiKeyGroup = document.getElementById('weatherApiKeyGroup');
      if (apiKeyGroup) {
        apiKeyGroup.style.display = (e.target.value === 'weatherapi') ? 'block' : 'none';
      }
    });
  }

  document.getElementById('updateWeather').addEventListener('click', () => {
    const loc = document.getElementById('weatherLoc').value;
    const provider = document.getElementById('weatherProvider')?.value || 'openmeteo';
    const apiKey = document.getElementById('weatherApiKey')?.value || '';
    
    localStorage.setItem('weather_provider', provider);
    localStorage.setItem('weather_api_key', apiKey);
    
    if (loc) {
      localStorage.setItem('weatherLoc', loc);
    }
    loadWeather();
  });

  // Radio settings listeners were removed since presets are discarded

  const updateSensorIp = document.getElementById('updateSensorIp');
  if(updateSensorIp) {
    updateSensorIp.addEventListener('click', () => {
      const input = document.getElementById('sensorIp');
      const ip = input ? input.value.trim() : '';
      if(ip) {
        localStorage.setItem('sensorIp', ip);
        refreshSensorWidget();
      }
    });
  }

  ['weather', 'waste', 'player', 'sensor', 'system', 'tasmota', 'fritzbox', 'presence', 'camera'].forEach(type => {
    const toggle = document.getElementById('toggle-' + type);
    if(toggle) {
      toggle.addEventListener('change', (e) => {
        const isVisible = e.target.checked;
        localStorage.setItem('show_' + type, isVisible);
        const widget = document.querySelector(`.widget[data-type="${type}"]`);
        if(widget) {
          if(isVisible){ widget.classList.remove('hidden'); widget.style.display = ''; }
          else { widget.classList.add('hidden'); widget.style.display = 'none'; }
        }
      });
    }
  });
}

async function loadWeather() {
  let locName = localStorage.getItem('weatherLoc') || 'Berlin';
  const provider = localStorage.getItem('weather_provider') || 'openmeteo';
  const apiKey = localStorage.getItem('weather_api_key') || '';

  let lat = parseFloat(localStorage.getItem('weather_lat'));
  let lon = parseFloat(localStorage.getItem('weather_lon'));
  let cachedLoc = localStorage.getItem('weather_loc_resolved');

  // 1. Geocoding nur machen, wenn die Stadt geaendert wurde oder noch keine Koordinaten da sind (fuer Open-Meteo)
  if (provider === 'openmeteo' && (!lat || !lon || cachedLoc !== locName)) {
    try {
      const geoRes = await (await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(locName)}&count=1&language=de&format=json`)).json();
      if (geoRes.results && geoRes.results.length > 0) {
        lat = geoRes.results[0].latitude;
        lon = geoRes.results[0].longitude;
        locName = geoRes.results[0].name;
        
        // In LocalStorage cachen
        localStorage.setItem('weather_lat', lat);
        localStorage.setItem('weather_lon', lon);
        localStorage.setItem('weather_loc_resolved', locName);
      }
    } catch(e) {
      console.warn("Geocoding fehlgeschlagen, nutze Fallback", e);
      if (!lat) { lat = 52.52; lon = 13.41; } // Fallback Berlin
    }
  } else if (provider === 'openmeteo') {
    locName = cachedLoc || locName;
  }

  let d = null;
  let success = false;

  // 2. Wetterdaten laden
  if (provider === 'weatherapi' && apiKey) {
    try {
      const query = (lat && lon) ? `${lat},${lon}` : locName;
      const weatherUrl = `https://api.weatherapi.com/v1/forecast.json?key=${apiKey}&q=${encodeURIComponent(query)}&days=1&aqi=no&alerts=no&lang=de`;
      const response = await fetch(weatherUrl);
      if (response.ok) {
        const rawData = await response.json();
        if (rawData && rawData.current) {
          const forecastday = rawData.forecast?.forecastday?.[0];
          const precipProb = forecastday?.day?.daily_chance_of_rain ?? 0;
          
          d = {
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
            }
          };
          locName = rawData.location.name;
          success = true;
          localStorage.setItem('cached_weather_data', JSON.stringify(d));
          localStorage.setItem('cached_weather_loc', locName);
          localStorage.setItem('cached_weather_time', new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }));
        }
      }
    } catch(e) {
      console.error("Fehler beim Laden von WeatherAPI:", e);
    }
  }

  // Fallback auf Open-Meteo, falls WeatherAPI fehlgeschlagen ist
  if (!success) {
    try {
      if (!lat) { lat = 52.52; lon = 13.41; }
      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
        `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_gusts_10m,precipitation,rain,pressure_msl,cloud_cover` +
        `&daily=temperature_2m_max,temperature_2m_min,uv_index_max,precipitation_probability_max,sunrise,sunset` +
        `&timezone=auto`;
      const response = await fetch(weatherUrl);
      if (response.ok) {
        d = await response.json();
        if (d && d.current) {
          success = true;
          localStorage.setItem('cached_weather_data', JSON.stringify(d));
          localStorage.setItem('cached_weather_loc', locName);
          localStorage.setItem('cached_weather_time', new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }));
        }
      }
    } catch(e) {
      console.error("Fehler beim Laden von Open-Meteo:", e);
    }
  }

  // 3. Wenn Laden nicht erfolgreich (z. B. Rate Limit), versuche Cache zu laden!
  if (!success) {
    const cachedData = localStorage.getItem('cached_weather_data');
    const cachedLocName = localStorage.getItem('cached_weather_loc');
    const cachedTime = localStorage.getItem('cached_weather_time');
    
    if (cachedData) {
      d = JSON.parse(cachedData);
      locName = cachedLocName || locName;
      console.log(`Nutze gecachte Wetterdaten von ${cachedTime} Uhr.`);
    } else {
      document.getElementById('weatherCity').textContent = locName;
      document.getElementById('weatherCondition').textContent = 'Limit erreicht';
      return;
    }
  }

  // 4. Wetter-UI rendern
  try {
    const cachedTime = localStorage.getItem('cached_weather_time') || '';
    const isCachedText = !success ? ` (Stand: ${cachedTime})` : '';
    
    document.getElementById('weatherCity').textContent = locName + isCachedText;
    document.querySelector('.weather-temp').innerHTML = Math.round(d.current.temperature_2m) + '&deg;';
    document.getElementById('w-humidity').textContent = d.current.relative_humidity_2m + ' %';
    document.getElementById('w-wind').textContent = Math.round(d.current.wind_speed_10m) + ' km/h';
    document.getElementById('w-minmax').textContent = Math.round(d.daily.temperature_2m_max[0]) + '° / ' + Math.round(d.daily.temperature_2m_min[0]) + '°';
    document.getElementById('w-feels').textContent = Math.round(d.current.apparent_temperature) + '°';
    document.getElementById('w-rain').textContent = (d.daily.precipitation_probability_max?.[0] ?? 0) + ' %';
    document.getElementById('w-pressure').textContent = Math.round(d.current.pressure_msl || d.current.pressure_mb || 1013) + ' hPa';
    document.getElementById('w-clouds').textContent = Math.round(d.current.cloud_cover) + ' %';
    document.getElementById('w-uv').textContent = (d.daily.uv_index_max?.[0] ?? 0).toFixed(1);
    
    let cond = { text: 'Bedeckt', icon: 'fa-cloud', style: 'cloudy' };
    
    if (d.current.is_weather_api) {
      const code = d.current.weather_code;
      const text = d.current.condition_text || '';
      
      if (code === 1000) {
        cond = { text: 'Sonnig', icon: 'fa-sun', style: 'sunny' };
      } else if (code === 1003) {
        cond = { text: 'Leicht bewölkt', icon: 'fa-cloud-sun', style: 'cloudy' };
      } else if (code === 1006 || code === 1009) {
        cond = { text: text || 'Bewölkt', icon: 'fa-cloud', style: 'cloudy' };
      } else if (code === 1030 || code === 1135 || code === 1147) {
        cond = { text: text || 'Nebel', icon: 'fa-smog', style: 'cloudy' };
      } else if (code === 1063 || code === 1150 || code === 1153 || code === 1180 || code === 1183 || code === 1186 || code === 1189) {
        cond = { text: text || 'Leichter Regen', icon: 'fa-cloud-rain', style: 'rainy' };
      } else if (code === 1087 || code === 1273 || code === 1276 || code === 1279 || code === 1282) {
        cond = { text: text || 'Gewitter', icon: 'fa-cloud-bolt', style: 'rainy' };
      } else if (code === 1066 || code === 1069 || code === 1072 || (code >= 1210 && code <= 1225) || (code >= 1249 && code <= 1264)) {
        cond = { text: text || 'Schnee', icon: 'fa-snowflake', style: 'cloudy' };
      } else if (code >= 1192 && code <= 1201 || code === 1240 || code === 1243 || code === 1246) {
        cond = { text: text || 'Starker Regen', icon: 'fa-cloud-showers-heavy', style: 'rainy' };
      } else {
        cond = { text: text || 'Bedeckt', icon: 'fa-cloud', style: 'cloudy' };
      }
    } else {
      const conditions = {
        0:{text:'Klar',icon:'fa-sun',style:'sunny'},
        1:{text:'Überwiegend klar',icon:'fa-sun',style:'sunny'},
        2:{text:'Leicht bewölkt',icon:'fa-cloud-sun',style:'cloudy'},
        3:{text:'Bewölkt',icon:'fa-cloud',style:'cloudy'},
        45:{text:'Nebel',icon:'fa-smog',style:'cloudy'},
        48:{text:'Reifnebel',icon:'fa-smog',style:'cloudy'},
        51:{text:'Nieselregen',icon:'fa-cloud-rain',style:'rainy'},
        53:{text:'Nieselregen',icon:'fa-cloud-rain',style:'rainy'},
        55:{text:'Starker Nieselregen',icon:'fa-cloud-rain',style:'rainy'},
        61:{text:'Regen',icon:'fa-cloud-rain',style:'rainy'},
        63:{text:'Regen',icon:'fa-cloud-showers-heavy',style:'rainy'},
        65:{text:'Starker Regen',icon:'fa-cloud-showers-heavy',style:'rainy'},
        71:{text:'Schnee',icon:'fa-snowflake',style:'cloudy'},
        80:{text:'Regenschauer',icon:'fa-cloud-sun-rain',style:'rainy'},
        95:{text:'Gewitter',icon:'fa-cloud-bolt',style:'rainy'}
      };
      cond = conditions[d.current.weather_code] || { text: 'Bedeckt', icon: 'fa-cloud', style: 'cloudy' };
    }
    
    document.getElementById('weatherCondition').textContent = cond.text;
    document.querySelector('.weather-icon').innerHTML = `<i class="fas ${cond.icon}"></i>`;
    document.querySelector('.weather-icon').className = `weather-icon ${cond.style}`;
  } catch(e) {
    console.error("Renderfehler beim Wetter:", e);
  }
}

async function loadICS() {
  try {
    const r = await fetch('/api/ics-data');
    const d = await r.json();
    if (d.success && d.data) {
      const events = [];
      const lines = d.data.split('\n');
      let inEvent = false, evt = {};
      lines.forEach(l => {
        if (l.startsWith('BEGIN:VEVENT')) { inEvent = true; evt = {}; }
        else if (l.startsWith('END:VEVENT')) { inEvent = false; if(evt.date) events.push(evt); }
        else if (inEvent) {
          if (l.startsWith('SUMMARY:')) evt.summary = l.substring(8).replace('\\,', ',');
          else { const m = l.match(/DTSTART[^:]*:(\d{8})/); if(m) evt.date = m[1]; }
        }
      });
      events.sort((a,b) => a.date.localeCompare(b.date));
      const list = document.getElementById('wasteBody');
      if(!list) return;
      
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayStr = today.getFullYear() + String(today.getMonth()+1).padStart(2,'0') + String(today.getDate()).padStart(2,'0');
      const upcoming = events.filter(e => e.date >= todayStr).slice(0, 4);
      
      if(upcoming.length === 0) { 
        list.innerHTML = '<p style="color:rgba(255,255,255,0.5);">Keine Termine.</p>'; 
        const alertContainer = document.getElementById('headerWasteAlert');
        if (alertContainer) { alertContainer.style.display = 'none'; alertContainer.innerHTML = ''; }
        return; 
      }
      
      let html = '<div class="waste-list">';
      const alerts = [];
      
      upcoming.forEach(e => {
        const dt = new Date(e.date.substring(0,4), e.date.substring(4,6)-1, e.date.substring(6,8));
        let type = 'residual'; const s = e.summary.toLowerCase();
        if(s.includes('bio')) type = 'bio'; else if(s.includes('papier')) type = 'paper'; else if(s.includes('gelb')||s.includes('plastik')) type = 'plastic';
        let dateStr = dt.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' });
        // Compare calendar days, not the current clock time. Otherwise tomorrow
        // before the current time-of-day was shown as "Heute".
        const diff = Math.round((dt - today) / (1000 * 60 * 60 * 24));
        if(diff === 0) dateStr = 'Heute'; else if(diff === 1) dateStr = 'Morgen';

        html += `
          <div class="waste-item ${type}">
            <div class="waste-title">
              <span class="bin-icon bin-${type}" aria-hidden="true"><span class="bin-lid"></span><span class="bin-body"></span><span class="bin-wheel left"></span><span class="bin-wheel right"></span></span>
              <span>${e.summary.replace(' in Altenburg', '')}</span>
            </div>
            <span>${dateStr}</span>
          </div>`;
          
        if (diff === 0 || diff === 1) {
          alerts.push({
            summary: e.summary.replace(' in Altenburg', ''),
            type,
            diff,
            dateStr: diff === 0 ? 'Heute' : 'Morgen'
          });
        }
      });
      html += '</div>';
      list.innerHTML = html;
      
      // Update Header-Alert
      const alertContainer = document.getElementById('headerWasteAlert');
      if (alertContainer) {
        if (alerts.length > 0) {
          alertContainer.innerHTML = '';
          alertContainer.style.display = 'flex';
          alerts.forEach(alert => {
            const pill = document.createElement('div');
            pill.className = `waste-alert-pill waste-alert-${alert.type}`;
            
            let icon = 'fa-trash-can';
            if (alert.type === 'bio') icon = 'fa-leaf';
            else if (alert.type === 'paper') icon = 'fa-box-open';
            else if (alert.type === 'plastic') icon = 'fa-recycle';
            
            pill.innerHTML = `
              <i class="fas ${icon} alert-icon-pulse"></i>
              <span><strong>${alert.dateStr}:</strong> ${alert.summary}</span>
            `;
            alertContainer.appendChild(pill);
          });
        } else {
          alertContainer.style.display = 'none';
          alertContainer.innerHTML = '';
        }
      }
    } else {
      const alertContainer = document.getElementById('headerWasteAlert');
      if (alertContainer) { alertContainer.style.display = 'none'; alertContainer.innerHTML = ''; }
    }
  } catch(e) {
    const alertContainer = document.getElementById('headerWasteAlert');
    if (alertContainer) { alertContainer.style.display = 'none'; alertContainer.innerHTML = ''; }
  }
}

let activeAudioElement = null;

function updateRadioUi(playing) {
  isPlaying = playing;
  const statusLabel = document.getElementById('widgetRadioStatus');
  const playBtnIcon = document.querySelector('#widgetPlayPauseBtn i');
  const playBtn = document.getElementById('widgetPlayPauseBtn');
  const visualizer = document.getElementById('radioVisualizer');
  const towerIcon = document.getElementById('widgetRadioTowerIcon');
  const towerWrapper = document.querySelector('.radio-ring-wrapper');
  
  if (playBtnIcon) {
    playBtnIcon.className = playing ? 'fas fa-stop' : 'fas fa-play';
  }
  if (playBtn) {
    if (playing) {
      playBtn.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
      playBtn.style.boxShadow = '0 4px 10px rgba(239, 68, 68, 0.25)';
    } else {
      playBtn.style.background = 'linear-gradient(135deg, var(--primary), #22c55e)';
      playBtn.style.boxShadow = '0 4px 10px rgba(74, 222, 128, 0.25)';
    }
  }
  
  if (visualizer) {
    visualizer.style.opacity = playing ? '0.45' : '0.15';
    if (playing) {
      visualizer.classList.add('active');
    } else {
      visualizer.classList.remove('active');
    }
  }

  if (towerIcon) {
    towerIcon.style.color = playing ? 'var(--primary)' : 'var(--text-muted)';
  }

  if (towerWrapper) {
    if (playing) {
      towerWrapper.style.borderColor = 'var(--primary)';
      towerWrapper.style.boxShadow = '0 0 15px var(--primary-glow)';
      towerWrapper.style.background = 'rgba(74, 222, 128, 0.05)';
    } else {
      towerWrapper.style.borderColor = 'rgba(255, 255, 255, 0.08)';
      towerWrapper.style.boxShadow = '0 0 0 rgba(74, 222, 128, 0)';
      towerWrapper.style.background = 'rgba(255, 255, 255, 0.03)';
    }
  }
  
  if (statusLabel) {
    statusLabel.textContent = playing ? 'LIVE' : 'Sender wählen';
    statusLabel.style.color = playing ? 'var(--primary)' : 'var(--accent-blue)';
  }
}

function stopRadioPlayback(removeSource = true) {
  if(hlsCore) {
    try { hlsCore.stopLoad(); hlsCore.detachMedia(); hlsCore.destroy(); } catch(e) {}
    hlsCore = null;
  }

  if(activeAudioElement) {
    try { activeAudioElement.pause(); } catch(e) {}
    if(removeSource) {
      try {
        activeAudioElement.removeAttribute('src');
        activeAudioElement.load();
        activeAudioElement.remove();
      } catch(e) {}
      activeAudioElement = null;
      const container = document.getElementById('audioPlayerContainer');
      if(container) container.replaceChildren();
    }
  }

  updateRadioUi(false);
}

function initRadioWakeGuards() {
  // Fully Kiosk/Android kann Media beim Screen-Wakeup wiederbeleben.
  // Deshalb reißen wir den Stream beim Verlassen/Schlafen komplett ab.
  const hardStop = () => stopRadioPlayback(true);
  document.addEventListener('visibilitychange', () => {
    if(document.hidden) hardStop();
  });
  window.addEventListener('pagehide', hardStop);
  window.addEventListener('pageshow', hardStop);
  document.addEventListener('freeze', hardStop);
}

function initAudioPlayer() {
  // Integrierte Steuerung über Widget und Popup
}

function playAudioStream(url, name = '', autoPlay = false) {
  const container = document.getElementById('audioPlayerContainer');
  if(!container) return;
  if(!autoPlay) return;
  
  // ALLES ABREISSEN
  stopRadioPlayback(true);

  // Name abspeichern und UI anpassen
  if (name) {
    localStorage.setItem('streamUrl', url);
    localStorage.setItem('streamName', name);
    const stationLabel = document.getElementById('widgetRadioStation');
    if (stationLabel) stationLabel.textContent = name;
  }

  // NEU BAUEN — nur nach explizitem Klick/Touch.
  activeAudioElement = document.createElement('audio');
  activeAudioElement.id = 'audioPlayer';
  activeAudioElement.preload = 'none';
  activeAudioElement.autoplay = false;
  activeAudioElement.controls = false;
  activeAudioElement.setAttribute('playsinline', '');
  
  // Lautstärke aus dem Speicher wiederherstellen
  const savedVol = localStorage.getItem('radioVolume') || '50';
  activeAudioElement.volume = savedVol / 100;
  
  container.replaceChildren(activeAudioElement);

  if(url.includes('.m3u8') || url.includes('.m3u')) {
    if(window.Hls && Hls.isSupported()){ 
        hlsCore = new Hls({ autoStartLoad: false }); 
        hlsCore.loadSource(url); 
        hlsCore.attachMedia(activeAudioElement); 
        hlsCore.startLoad();
    }
    else if(activeAudioElement.canPlayType('application/vnd.apple.mpegurl')) {
        activeAudioElement.src=url;
    }
  } else {
      activeAudioElement.src = url;
  }
  
  const playPromise = activeAudioElement.play();
  if (playPromise !== undefined) {
      playPromise.then(() => {
        updateRadioUi(true);
      }).catch(e => {
          console.error("Radio Start", e);
          stopRadioPlayback(true);
      });
  }
}

function initRadioWidget() {
  let savedName = localStorage.getItem('streamName');
  const stationLabel = document.getElementById('widgetRadioStation');
  
  if (savedName === 'null' || savedName === 'undefined' || !savedName || savedName.trim() === '') {
    savedName = 'FRITZ!Box Radio';
  }
  
  if (stationLabel) {
    stationLabel.textContent = savedName;
  }

  // Widget Lautstärke-Slider initialisieren
  const widgetVolume = document.getElementById('widgetVolumeSlider');
  if (widgetVolume) {
    const savedVol = localStorage.getItem('radioVolume') || '50';
    widgetVolume.value = savedVol;
    
    widgetVolume.addEventListener('input', (e) => {
      const vol = e.target.value;
      localStorage.setItem('radioVolume', vol);
      if (activeAudioElement) {
        activeAudioElement.volume = vol / 100;
      }
      // Mit Popup-Lautstärke synchronisieren falls offen
      const popupVolume = document.getElementById('popupVolumeSlider');
      if (popupVolume) popupVolume.value = vol;
    });
  }

  // Widget Play/Pause-Button initialisieren
  const widgetPlayBtn = document.getElementById('widgetPlayPauseBtn');
  if (widgetPlayBtn) {
    widgetPlayBtn.addEventListener('click', () => {
      if (isPlaying) {
        stopRadioPlayback(true);
      } else {
        const url = localStorage.getItem('streamUrl');
        const name = localStorage.getItem('streamName') || 'FRITZ!Box Radio';
        if (url) {
          playAudioStream(url, name, true);
        } else {
          // Wenn kein Sender hinterlegt ist -> Popup öffnen
          const chooseBtn = document.getElementById('chooseStationBtn');
          if (chooseBtn) chooseBtn.click();
        }
      }
    });
  }
}

function initFritzRadioPopup() {
  const chooseBtn = document.getElementById('chooseStationBtn');
  const overlay = document.getElementById('fritzRadioOverlay');
  const closeBtn = document.getElementById('closeFritzRadio');
  const grid = document.getElementById('overlayStationsGrid');
  const countBadge = document.getElementById('overlayStationsCount');
  const infoCard = document.getElementById('overlayInfoCard');
  const popupVolume = document.getElementById('popupVolumeSlider');

  if (!chooseBtn || !overlay) return;

  const demoStations = [
    { name: "MDR JUMP (Live)", url: "http://mdr-284320-0.cast.mdr.de/mdr/284320/0/mp3/high/stream.mp3" },
    { name: "Antenne Thüringen", url: "https://top.antennethueringen.de/live/mp3-192/" },
    { name: "80s80s Radio", url: "http://stream.80s80s.de/80s80s/mp3-192/" },
    { name: "WDR 2 (Köln)", url: "http://wdr-wdr2-koeln.cast.addradio.de/wdr/wdr2/koeln/mp3/128/stream.mp3" }
  ];

  // Lautstärkeregler im Popup initialisieren
  if (popupVolume) {
    const savedVol = localStorage.getItem('radioVolume') || '50';
    popupVolume.value = savedVol;
    
    popupVolume.addEventListener('input', (e) => {
      const vol = e.target.value;
      localStorage.setItem('radioVolume', vol);
      if (activeAudioElement) {
        activeAudioElement.volume = vol / 100;
      }
      // Mit Widget-Lautstärke synchronisieren
      const widgetVolume = document.getElementById('widgetVolumeSlider');
      if (widgetVolume) widgetVolume.value = vol;
    });
  }

  chooseBtn.addEventListener('click', async () => {
    overlay.removeAttribute('hidden');
    countBadge.textContent = 'Laden...';
    grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); font-size: 13px; padding: 20px;"><i class="fas fa-spinner fa-spin"></i> Senderliste wird geladen...</div>';
    infoCard.style.display = 'none';

    // Lautstärkeregler-Wert beim Öffnen aktualisieren
    if (popupVolume) {
      popupVolume.value = localStorage.getItem('radioVolume') || '50';
    }

    try {
      const res = await fetch('/api/fritzbox/radio');
      const data = await res.json();
      grid.innerHTML = '';

      let stations = data.stations || [];
      if (stations.length === 0) {
        infoCard.style.display = 'flex';
        countBadge.textContent = '0 Sender in FRITZ!Box (Demo geladen)';
        renderStations(demoStations, true);
      } else {
        infoCard.style.display = 'none';
        countBadge.textContent = stations.length + ' Sender gefunden';
        renderStations(stations, false);
      }
    } catch (e) {
      console.error('[Radio Overlay] Ladefehler:', e);
      grid.innerHTML = '';
      infoCard.style.display = 'flex';
      countBadge.textContent = 'Ladefehler (Demo geladen)';
      renderStations(demoStations, true);
    }
  });

  function renderStations(list, isDemo) {
    const currentUrl = localStorage.getItem('streamUrl');
    grid.innerHTML = '';

    // 1. Spezieller "Ausschalten"-Button
    if (isPlaying) {
      const stopCard = document.createElement('button');
      stopCard.className = 'station-btn stop-btn';
      stopCard.style.cssText = 'border-color: rgba(239, 68, 68, 0.3) !important; background: rgba(239, 68, 68, 0.05) !important; color: #ef4444 !important; font-weight: 600;';
      stopCard.innerHTML = '<i class="fas fa-power-off" style="color: #ef4444;"></i>' +
        '<span class="station-name" style="color: #ef4444; font-weight: 600;">Radio ausschalten</span>' +
        '<div class="station-status-indicator" style="background: #ef4444; box-shadow: 0 0 8px #ef4444;"></div>';
      
      stopCard.addEventListener('click', () => {
        overlay.setAttribute('hidden', '');
        stopRadioPlayback(true);
        localStorage.removeItem('streamUrl');
        localStorage.removeItem('streamName');
        const stationLabel = document.getElementById('widgetRadioStation');
        if (stationLabel) stationLabel.textContent = 'FRITZ!Box Radio';
        updateRadioUi(false);
      });
      grid.appendChild(stopCard);
    }

    list.forEach(st => {
      const card = document.createElement('button');
      card.className = 'station-btn';
      if (isPlaying && currentUrl === st.url) {
        card.classList.add('active');
      }

      let innerHTML = '<i class="fas fa-radio" style="font-size:1.3rem;"></i>' +
        '<span class="station-name" style="display:block; font-size:0.95rem; font-weight:500; color:inherit; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; width:100%; min-height:1.2em; line-height:1.3;">' + st.name + '</span>';
      
      if (isDemo) {
        innerHTML += '<small style="font-size: 9px; color: var(--accent-blue); font-weight:600; margin-top:2px;">DEMO</small>';
      }
      
      innerHTML += '<div class="station-status-indicator"></div>';
      card.innerHTML = innerHTML;

      card.addEventListener('click', () => {
        overlay.setAttribute('hidden', '');
        playAudioStream(st.url, st.name, true);
      });

      grid.appendChild(card);
    });
  }

  const closeOverlay = () => overlay.setAttribute('hidden', '');
  if (closeBtn) closeBtn.addEventListener('click', closeOverlay);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeOverlay();
  });
}

function clampNumber(value, min, max) {
  const n = Number(value);
  if(!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function setGauge(id, value, min, max) {
  const el = document.getElementById(id);
  if(!el) return;
  const pct = ((clampNumber(value, min, max) - min) / (max - min)) * 100;
  el.style.setProperty('--value', pct.toFixed(1));
  el.style.setProperty('--sweep', `${(pct * 0.75).toFixed(1)}%`);
}

async function refreshSensorWidget() {
  const status = document.getElementById('sensorStatus');
  const tempEl = document.getElementById('sensorTemp');
  const humidityEl = document.getElementById('sensorHumidity');
  const dewEl = document.getElementById('sensorDew');
  if(!tempEl) return;

  const ip = localStorage.getItem('sensorIp') || '192.168.178.40';
  try {
    const res = await fetch(`/api/tasmota/sensor?ip=${encodeURIComponent(ip)}`);
    const data = await res.json();
    if(!data.success) throw new Error(data.error || 'Sensor nicht erreichbar');

    const temp = Number(data.temperature);
    tempEl.textContent = Number.isFinite(temp) ? `${temp.toFixed(1)}°` : '--°';
    setGauge('tempGauge', temp, -10, 40);

    if(humidityEl) {
      const humidity = Number(data.humidity);
      humidityEl.textContent = Number.isFinite(humidity) ? `${humidity.toFixed(0)}%` : '--%';
      setGauge('humidityGauge', humidity, 0, 100);
    }
    if(dewEl) {
      const dew = Number(data.dewPoint);
      dewEl.textContent = Number.isFinite(dew) ? `Taupunkt ${dew.toFixed(1)}°` : 'Taupunkt --°';
    }
    if(status) status.textContent = data.time ? data.time.slice(11, 16) : ip;
  } catch(e) {
    tempEl.textContent = '--°';
    setGauge('tempGauge', 0, -10, 40);
    if(humidityEl) {
      humidityEl.textContent = '--%';
      setGauge('humidityGauge', 0, 0, 100);
    }
    if(dewEl) dewEl.textContent = 'Taupunkt --°';
    if(status) status.textContent = 'offline';
  }
}

function initSensorWidget() {
  refreshSensorWidget();
  setInterval(refreshSensorWidget, 15000);
}

function initSystemBargraph() {
  function createSegments(id) {
    const c = document.getElementById(id); if(!c) return; c.innerHTML = '';
    for(let i=0; i<20; i++) {
      const s = document.createElement('div'); s.className = 'segment';
      if(i<12) s.classList.add('c-green'); else if(i<17) s.classList.add('c-yellow'); else s.classList.add('c-red');
      c.appendChild(s);
    }
  }
  ['seg-cpu','seg-ram','seg-temp','seg-net'].forEach(createSegments);

  function updateBar(id, val, max, unit, dec=0) {
    const el = document.getElementById('val-'+id); if(!el) return;
    el.textContent = (dec?val.toFixed(dec):Math.round(val)) + ' ' + unit;
    const c = document.getElementById('seg-'+id); if(!c) return;
    const pct = Math.max(0, Math.min(val/max, 1));
    const active = Math.round(pct * 20);
    for(let i=0; i<20; i++) i < active ? c.children[i].classList.add('active') : c.children[i].classList.remove('active');
  }

  socket.on('sys-status', d => {
    updateBar('cpu', d.cpu, 100, '%'); updateBar('ram', d.ram, 100, '%'); updateBar('temp', d.temp, 90, '°C'); updateBar('net', d.net, 15, 'MB/s', 2);
  });
}

async function initTasmota() {
  await fetchTasmotaList();
  
  const addBtn = document.getElementById('addTasmota');
  if(addBtn) {
    addBtn.addEventListener('click', async () => {
      const ip = document.getElementById('tasmotaManIp').value.trim();
      const name = document.getElementById('tasmotaManName').value.trim();
      if(ip && name) {
        tasmotaDevices.push({ip, name});
        await saveTasmotaList();
        document.getElementById('tasmotaManIp').value = '';
        document.getElementById('tasmotaManName').value = '';
      }
    });
  }

  const scanBtn = document.getElementById('scanTasmota');
  if(scanBtn) {
    scanBtn.addEventListener('click', async () => {
      const base = document.getElementById('tasmotaSubnet').value.trim();
      if(!base) return;
      scanBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
      try {
        const res = await fetch('/api/tasmota/scan', {
          method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({baseIp: base})
        });
        const data = await res.json();
        if(data.found && data.found.length > 0) {
          data.found.forEach(f => {
            if(!tasmotaDevices.find(d => d.ip === f.ip)) tasmotaDevices.push(f);
          });
          await saveTasmotaList();
          alert(data.found.length + " Geräte gefunden!");
        } else {
          alert("Keine weiteren Geräte gefunden.");
        }
      } catch(e) {}
      scanBtn.innerHTML = '<i class="fas fa-search"></i>';
    });
  }
}

// === UPDATED FALLBACK TASMOTA ===
async function fetchTasmotaList() {
  try {
    const res = await fetch('/api/tasmota');
    const data = await res.json();
    if(data && Array.isArray(data)) tasmotaDevices = data;
    else tasmotaDevices = [];
  } catch(e) {
    tasmotaDevices = JSON.parse(localStorage.getItem('tasmotaBackup') || '[]');
  }
  renderTasmotaSettings();
  renderTasmotaButtons();
  refreshTasmotaStatus();
}

async function saveTasmotaList() {
  localStorage.setItem('tasmotaBackup', JSON.stringify(tasmotaDevices));
  try {
    const res = await fetch('/api/tasmota', {
      method: 'POST', 
      headers: {'Content-Type': 'application/json'}, 
      body: JSON.stringify(tasmotaDevices)
    });
    const data = await res.json();
    if(data.success && data.saved) {
      tasmotaDevices = data.saved;
    }
  } catch(e) {
    console.error("Backend Save Fehler", e);
  }
  renderTasmotaSettings();
  renderTasmotaButtons();
}

window.removeTasmota = function(ip) {
  tasmotaDevices = tasmotaDevices.filter(d => d.ip !== ip);
  saveTasmotaList();
}

window.toggleTasmota = async function(ip) {
  const btn = document.getElementById('tasmota-btn-' + ip.replace(/\./g, '-'));
  if(btn) btn.style.transform = 'scale(0.95)';
  
  try {
    const res = await fetch('/api/tasmota/toggle', {
      method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ip})
    });
    const data = await res.json();
    if(data.success) {
      if(data.state === 'ON') {
        btn.classList.add('active');
        btn.classList.remove('off');
      } else {
        btn.classList.remove('active');
        btn.classList.add('off');
      }
    }
  } catch(e) {}
  
  if(btn) setTimeout(() => btn.style.transform = 'scale(1)', 150);
}

function renderTasmotaSettings() {
  const list = document.getElementById('tasmotaList');
  if(!list) return;
  list.innerHTML = '';
  tasmotaDevices.forEach(d => {
    const div = document.createElement('div');
    div.className = 'tasmota-setting-item';
    const label = document.createElement('span');
    const name = document.createElement('b');
    name.textContent = d.name;
    const ip = document.createElement('small');
    ip.textContent = `(${d.ip})`;
    const button = document.createElement('button');
    button.className = 'btn-del';
    button.innerHTML = '<i class="fas fa-trash"></i>';
    button.addEventListener('click', () => window.removeTasmota(d.ip));
    label.append(name, ' ', ip);
    div.append(label, button);
    list.appendChild(div);
  });
}

function renderTasmotaButtons() {
  const body = document.getElementById('tasmotaBody');
  if(!body) return;
  body.innerHTML = '';
  tasmotaDevices.forEach(d => {
    const btn = document.createElement('button');
    btn.className = 'tasmota-btn';
    btn.id = 'tasmota-btn-' + d.ip.replace(/\./g, '-');
    const icon = document.createElement('i');
    icon.className = 'fas fa-power-off';
    const label = document.createElement('span');
    label.textContent = d.name;
    btn.append(icon, label);
    btn.onclick = () => window.toggleTasmota(d.ip);
    body.appendChild(btn);
  });
}

async function refreshTasmotaStatus() {
  if (tasmotaDevices.length === 0) return;
  try {
    const res = await fetch('/api/tasmota/status');
    const statusArray = await res.json();
    statusArray.forEach(s => {
      const btn = document.getElementById('tasmota-btn-' + s.ip.replace(/\./g, '-'));
      if(btn) {
        if(!s.online) { btn.classList.remove('active', 'off'); btn.style.opacity = '0.5'; }
        else {
          btn.style.opacity = '1';
          if(s.state === 'ON') {
            btn.classList.add('active');
            btn.classList.remove('off');
          } else {
            btn.classList.remove('active');
            btn.classList.add('off');
          }
        }
      }
    });
  } catch(e) {}
}
setInterval(refreshTasmotaStatus, 3000);

function initAccordion() {
  const headers = document.querySelectorAll('.accordion-header');
  headers.forEach(header => {
    header.addEventListener('click', () => {
      // Wenn das angeklickte ohnehin aktiv ist -> schließen
      const isActive = header.classList.contains('active');
      
      // Schließe erstmal alle anderen
      headers.forEach(h => {
        h.classList.remove('active');
        h.nextElementSibling.classList.remove('active-body');
      });

      // Mach das geklickte auf (wenn es vorher zu war)
      if(!isActive) {
        header.classList.add('active');
        header.nextElementSibling.classList.add('active-body');
      }
    });
  });
}

async function initFritzbox() {
  // Load saved Fritz!Box configuration (excluding password for security)
  try {
    const res = await fetch('/api/fritzbox/config');
    const cfg = await res.json();
    if(cfg && cfg.success) {
      if(document.getElementById('fritzIp')) document.getElementById('fritzIp').value = cfg.ip || '192.168.178.1';
      if(document.getElementById('fritzUser')) document.getElementById('fritzUser').value = cfg.user || '';
      if(document.getElementById('toggleFritzCallMonitor')) document.getElementById('toggleFritzCallMonitor').checked = cfg.callMonitorEnabled !== false;
    }
  } catch(e) {}

  // Save configuration event listener
  const saveBtn = document.getElementById('saveFritzConfig');
  if(saveBtn) {
    saveBtn.addEventListener('click', async () => {
      const ip = document.getElementById('fritzIp').value.trim();
      const user = document.getElementById('fritzUser').value.trim();
      const pass = document.getElementById('fritzPassword').value;
      const callMonitorEnabled = document.getElementById('toggleFritzCallMonitor').checked;
      
      if(!ip) {
        alert('Bitte gib die IP-Adresse deiner Fritz!Box ein.');
        return;
      }

      saveBtn.disabled = true;
      const oldText = saveBtn.innerHTML;
      saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verbinde...';

      try {
        const response = await fetch('/api/fritzbox/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ip, user, pass, callMonitorEnabled })
        });
        const data = await response.json();
        if(data && data.success) {
          alert('Fritz!Box Konfiguration erfolgreich gespeichert und verbunden!');
          if(document.getElementById('fritzPassword')) document.getElementById('fritzPassword').value = ''; // clear password field
        } else {
          alert('Fehler beim Speichern der Konfiguration: ' + (data.error || 'Unbekannter Fehler'));
        }
      } catch(err) {
        alert('Verbindungsfehler: ' + err.message);
      } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = oldText;
      }
    });
  }

  // Socket.IO real-time handlers
  
  // 1. Network & Router Status updates
  socket.on('fritz-status', (status) => {
    const ledFritz = document.getElementById('ledFritz');
    const valFritzStatus = document.getElementById('valFritzStatus');
    const ledInternet = document.getElementById('ledInternet');
    const valInternetStatus = document.getElementById('valInternetStatus');

    if(ledFritz && valFritzStatus) {
      if(status.fritzOnline) {
        ledFritz.className = 'led-dot green';
        valFritzStatus.textContent = `Online (${status.fritzLatency}ms)`;
      } else {
        ledFritz.className = 'led-dot red';
        valFritzStatus.textContent = 'Offline';
      }
    }

    if(ledInternet && valInternetStatus) {
      if(status.internetOnline) {
        ledInternet.className = 'led-dot green';
        valInternetStatus.textContent = `Online (${status.internetLatency}ms)`;
      } else {
        ledInternet.className = 'led-dot red';
        valInternetStatus.textContent = 'Offline';
      }
    }
  });

  // 2. Call log updates
  socket.on('fritz-calls', (calls) => {
    const list = document.getElementById('fritzCallList');
    if(!list) return;

    if(!calls || calls.length === 0) {
      list.innerHTML = '<div class="no-calls">Keine Anrufe protokolliert.</div>';
      return;
    }

    list.innerHTML = '';
    calls.forEach(call => {
      const item = document.createElement('div');
      item.className = 'fritz-call-item';
      
      let iconClass = 'fa-phone';
      let iconStyleClass = 'inbound';
      let typeLabel = 'Eingehend';

      if(call.type === 'RING') {
        iconClass = 'fa-phone-volume';
        iconStyleClass = 'inbound';
        typeLabel = 'Eingehend';
      } else if(call.type === 'CALL') {
        iconClass = 'fa-phone-flip';
        iconStyleClass = 'outbound';
        typeLabel = 'Ausgehend';
      } else if(call.type === 'MISSED') {
        iconClass = 'fa-phone-slash';
        iconStyleClass = 'missed';
        typeLabel = 'Verpasst';
      } else if(call.type === 'CONNECTED') {
        iconClass = 'fa-phone-square';
        iconStyleClass = 'connected';
        typeLabel = 'Verbunden';
      }

      // Format Duration
      let durText = '';
      if(call.duration > 0) {
        const m = Math.floor(call.duration / 60);
        const s = call.duration % 60;
        durText = m > 0 ? `${m}m ${s}s` : `${s}s`;
      } else if(call.type === 'MISSED') {
        durText = 'Verpasst';
      } else if(call.type === 'RING') {
        durText = 'Klingelt...';
      } else {
        durText = 'Keine Verb.';
      }

      item.innerHTML = `
        <div class="call-info-left">
          <div class="call-icon ${iconStyleClass}"><i class="fas ${iconClass}"></i></div>
          <div class="call-details">
            <span class="call-name">${call.callerName || call.number}</span>
            <span class="call-time">${call.time} Uhr · ${typeLabel}</span>
          </div>
        </div>
        <span class="call-duration">${durText}</span>
      `;
      list.appendChild(item);
    });
  });

  // 3. Live call ring overlay
  socket.on('fritz-ringing', (event) => {
    const overlay = document.getElementById('fritzToastOverlay');
    const toastNumber = document.getElementById('fritzToastNumber');
    const toastCaller = document.getElementById('fritzToastCaller');

    if(!overlay) return;

    if(event.active) {
      if(toastNumber) toastNumber.textContent = event.number;
      if(toastCaller) toastCaller.textContent = event.callerName || 'Unbekannter Anrufer';
      overlay.removeAttribute('hidden');
    } else {
      overlay.setAttribute('hidden', '');
    }
  });
}

async function initPresence() {
  const addBtn = document.getElementById('addPresenceBtn');
  const fileInput = document.getElementById('presenceManAvatar');
  const fileNameSpan = document.getElementById('presenceManAvatarName');
  
  let uploadedAvatarUrl = '';

  // 1. Profilbild Upload Handler
  if(fileInput && fileNameSpan) {
    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if(!file) {
        fileNameSpan.textContent = 'Kein Bild gewählt';
        uploadedAvatarUrl = '';
        return;
      }
      
      fileNameSpan.textContent = file.name;

      const formData = new FormData();
      formData.append('avatarFile', file);
      
      try {
        const res = await fetch('/api/presence/upload', {
          method: 'POST',
          body: formData
        });
        const data = await res.json();
        if(data && data.success) {
          uploadedAvatarUrl = data.url;
        } else {
          alert('Fehler beim Hochladen des Bildes: ' + (data.error || 'Unbekannter Fehler'));
        }
      } catch(err) {
        console.error('Upload Error:', err);
      }
    });
  }

  // 2. Person hinzufügen Handler
  if(addBtn) {
    addBtn.addEventListener('click', async () => {
      const nameInput = document.getElementById('presenceManName');
      const macInput = document.getElementById('presenceManMac');
      if(!nameInput || !macInput) return;

      const name = nameInput.value.trim();
      const mac = macInput.value.trim();

      if(!name || !mac) {
        alert('Bitte gib Name und MAC-Adresse ein.');
        return;
      }

      if(!/^([0-9A-F]{2}[:-]){5}([0-9A-F]{2})$/i.test(mac)) {
        alert('Ungültiges MAC-Adressen-Format. Bitte verwende z.B. AA:BB:CC:DD:EE:FF');
        return;
      }

      try {
        const res = await fetch('/api/presence', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            mac,
            image: uploadedAvatarUrl || '/sabine.png' // default fallback image
          })
        });
        const data = await res.json();
        if(data && data.success) {
          nameInput.value = '';
          macInput.value = '';
          fileInput.value = '';
          fileNameSpan.textContent = 'Kein Bild gewählt';
          uploadedAvatarUrl = '';
        } else {
          alert('Fehler beim Hinzufügen: ' + (data.error || 'Unbekannter Fehler'));
        }
      } catch(err) {
        alert('Fehler beim Hinzufügen der Person.');
      }
    });
  }

  // Web Audio API Synthesizer für einen edlen, warmen Chime-Sound (Offline-fähig, ohne externe Audio-Assets)
  function playPresencePing() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      
      const playNote = (frequency, startTime, duration, volume = 0.2) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(frequency, startTime);
        
        gain.gain.setValueAtTime(0.001, startTime);
        gain.gain.linearRampToValueAtTime(volume, startTime + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(startTime);
        osc.stop(startTime + duration);
      };

      const now = ctx.currentTime;
      // Edles zweistufiges "Chime"-Signal (C5 -> E5)
      playNote(523.25, now, 0.4, 0.15); 
      playNote(659.25, now + 0.1, 0.5, 0.2);
    } catch (e) {
      console.warn("AudioContext blockiert oder nicht unterstützt:", e);
    }
  }

  // Render Functions
  function renderPresenceSettings(persons) {
    const list = document.getElementById('presenceList');
    if(!list) return;
    list.innerHTML = '';

    if(persons.length === 0) {
      list.innerHTML = '<div style="font-size: 11px; color: var(--text-muted); text-align: center; padding: 10px;">Keine Personen registriert.</div>';
      return;
    }

    persons.forEach(p => {
      const row = document.createElement('div');
      row.className = 'tasmota-row';
      row.style.cssText = 'display: flex; align-items: center; justify-content: space-between; padding: 8px; background: rgba(255,255,255,0.02); border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);';
      
      row.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
          <img src="${p.image || '/sabine.png'}" style="width: 30px; height: 30px; border-radius: 50%; object-fit: cover;">
          <div style="display: flex; flex-direction: column; text-align: left;">
            <span class="t-name" style="font-weight: 700;">${p.name}</span>
            <span class="t-ip" style="font-size: 9px; color: var(--text-muted);">${p.mac}</span>
          </div>
        </div>
        <button class="t-btn danger" style="padding: 6px 10px;" onclick="removePerson('${p.id}')"><i class="fas fa-trash"></i></button>
      `;
      list.appendChild(row);
    });
  }

  window.removePerson = async function(id) {
    if(!confirm('Möchtest du diese Person wirklich löschen?')) return;
    try {
      const res = await fetch('/api/presence/' + id, { method: 'DELETE' });
      const data = await res.json();
      if(!data.success) {
        alert('Fehler beim Löschen: ' + (data.error || 'Unbekannter Fehler'));
      }
    } catch(err) {
      console.error('Löschen fehlgeschlagen:', err);
    }
  };

  function renderPresenceWidget(persons) {
    const grid = document.getElementById('presenceAvatarsGrid');
    if(!grid) return;
    grid.innerHTML = '';

    if(persons.length === 0) {
      grid.innerHTML = '<div class="no-presence-devices">Keine Personen registriert.</div>';
      return;
    }

    persons.forEach(p => {
      const card = document.createElement('div');
      card.className = `presence-avatar-card ${p.active ? 'active' : 'inactive'}`;
      card.id = `usr-${p.id}`;
      card.style.cssText = 'display: flex; flex-direction: column; align-items: center; gap: 8px; transition: var(--transition);';
      
      const badgeStyle = p.active ? 'background-color: var(--green);' : 'background-color: var(--text-muted);';
      const statusText = p.active ? 'Zu Hause' : 'Unterwegs';
      const statusColor = p.active ? 'color: var(--green);' : 'color: var(--text-muted);';

      card.innerHTML = `
        <div class="presence-avatar-ring ${p.active ? 'active' : ''}" style="position: relative; width: 80px; height: 80px; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
          <img src="${p.image || '/sabine.png'}" class="presence-avatar-img" style="width: 70px; height: 70px; border-radius: 50%; object-fit: cover;">
          <span class="presence-status-badge ${p.active ? 'active' : ''}" style="position: absolute; bottom: 2px; right: 2px; width: 14px; height: 14px; border-radius: 50%; ${badgeStyle} border: 2.5px solid #0f1225;"></span>
        </div>
        <span class="presence-avatar-name" style="font-size: 13px; font-weight: 600; color: #fff;">${p.name}</span>
        <span class="presence-avatar-status" style="font-size: 10px; ${statusColor}">${statusText}</span>
      `;
      grid.appendChild(card);
    });
  }

  // Socket.IO event handling
  socket.on('presence-list-updated', (persons) => {
    renderPresenceSettings(persons);
    renderPresenceWidget(persons);
  });

  socket.on('presence-updated', (persons) => {
    persons.forEach(p => {
      const card = document.getElementById(`usr-${p.id}`);
      if(card) {
        const ring = card.querySelector('.presence-avatar-ring');
        const badge = card.querySelector('.presence-status-badge');
        const status = card.querySelector('.presence-avatar-status');
        
        const wasInactive = card.classList.contains('inactive');
        
        if(p.active) {
          card.classList.remove('inactive');
          card.classList.add('active');
          ring.classList.add('active');
          badge.classList.add('active');
          badge.style.backgroundColor = 'var(--green)';
          status.textContent = 'Zu Hause';
          status.style.color = 'var(--green)';
          
          if(wasInactive) {
            playPresencePing();
          }
        } else {
          card.classList.remove('active');
          card.classList.add('inactive');
          ring.classList.remove('active');
          badge.classList.remove('active');
          badge.style.backgroundColor = 'var(--text-muted)';
          status.textContent = 'Unterwegs';
          status.style.color = 'var(--text-muted)';
        }
      }
    });
  });

  // Initial load
  try {
    const res = await fetch('/api/presence');
    const persons = await res.json();
    if(Array.isArray(persons)) {
      renderPresenceSettings(persons);
      renderPresenceWidget(persons);
    }
  } catch(err) {
    console.error('Initial load of presence failed:', err);
  }
}

// ==== KAMERA MONITOR WIDGET & SETTINGS ====
let activeCameraIntervals = {};
let currentCameras = [];
let fullscreenInterval = null;

// Hilfsfunktion zum sauberen Hinzufügen eines Timestamps zur URL ohne andere Parameter zu löschen
function getTimestampedUrl(url) {
  try {
    const urlObj = new URL(url);
    urlObj.searchParams.set('t', Date.now().toString());
    return urlObj.toString();
  } catch (e) {
    const cleanUrl = url.replace(/[?&]t=\d+/, '');
    const separator = cleanUrl.includes('?') ? '&' : '?';
    return cleanUrl + separator + 't=' + Date.now();
  }
}

async function initCameraWidget() {
  const addBtn = document.getElementById('addCameraBtn');
  if(!addBtn) return;

  // 1. Kamera hinzufügen Handler
  addBtn.addEventListener('click', async () => {
    const nameInput = document.getElementById('cameraManName');
    const urlInput = document.getElementById('cameraManUrl');
    const intervalSelect = document.getElementById('cameraManInterval');
    if(!nameInput || !urlInput) return;

    const name = nameInput.value.trim();
    const url = urlInput.value.trim();
    const interval = Number(intervalSelect.value);

    if(!name || !url) {
      alert('Bitte gib Name und URL für die Kamera ein.');
      return;
    }

    try {
      const res = await fetch('/api/cameras', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, url, interval })
      });
      const data = await res.json();
      if(data && data.success) {
        nameInput.value = '';
        urlInput.value = '';
        intervalSelect.value = '0';
      } else {
        alert('Fehler beim Hinzufügen: ' + (data.error || 'Unbekannter Fehler'));
      }
    } catch(err) {
      alert('Fehler beim Hinzufügen der Kamera.');
    }
  });

  // 2. Vollbild Schließen Handler
  const closeOverlayBtn = document.getElementById('closeCameraFullscreen');
  const overlay = document.getElementById('cameraFullscreenOverlay');
  if(closeOverlayBtn && overlay) {
    const closeOverlay = () => {
      overlay.setAttribute('hidden', '');
      const fsImg = document.getElementById('fullscreenCameraImg');
      if(fsImg) {
        fsImg.src = ''; // Download stoppen
        delete fsImg.dataset.cameraId;
      }
      if(fullscreenInterval) {
        clearInterval(fullscreenInterval);
        fullscreenInterval = null;
      }
    };
    closeOverlayBtn.addEventListener('click', closeOverlay);
    overlay.addEventListener('click', (e) => {
      if(e.target === overlay || e.target.classList.contains('fullscreen-content')) {
        closeOverlay();
      }
    });
  }

  // 3. Socket-Event Registrierung
  socket.on('cameras-updated', (cameras) => {
    currentCameras = cameras;
    renderCameraSettings(cameras);
    renderCameraWidget(cameras);
  });

  // 4. Initialer Abruf
  try {
    const res = await fetch('/api/cameras');
    const cameras = await res.json();
    if(Array.isArray(cameras)) {
      currentCameras = cameras;
      renderCameraSettings(cameras);
      renderCameraWidget(cameras);
    }
  } catch(err) {
    console.error('Initialer Kamera-Abruf fehlgeschlagen:', err);
  }

  // 5. Watchdogs für Tab-Aktivierung & Online-Status
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && currentCameras.length > 0) {
      console.log('[Camera Watchdog] Tab aktiv - aktualisiere Feeds...');
      renderCameraWidget(currentCameras);
      
      // Falls das Vollbild-Overlay offen ist, auch dieses aktualisieren
      const overlay = document.getElementById('cameraFullscreenOverlay');
      const fsImg = document.getElementById('fullscreenCameraImg');
      if (overlay && !overlay.hasAttribute('hidden') && fsImg) {
        const activeFullscreenCameraId = fsImg.dataset.cameraId;
        const activeCam = currentCameras.find(c => c.id === activeFullscreenCameraId);
        if (activeCam) {
          fsImg.src = getTimestampedUrl(activeCam.url);
        }
      }
    }
  });

  window.addEventListener('online', () => {
    if (currentCameras.length > 0) {
      console.log('[Camera Watchdog] Netzwerk wieder online - aktualisiere Feeds...');
      renderCameraWidget(currentCameras);
    }
  });
}

function renderCameraSettings(cameras) {
  const list = document.getElementById('cameraSettingsList');
  if(!list) return;
  list.innerHTML = '';

  if(cameras.length === 0) {
    list.innerHTML = '<div style="font-size: 11px; color: var(--text-muted); text-align: center; padding: 10px;">Keine Kameras registriert.</div>';
    return;
  }

  cameras.forEach(c => {
    const row = document.createElement('div');
    row.className = 'tasmota-row';
    row.style.cssText = 'display: flex; align-items: center; justify-content: space-between; padding: 8px; background: rgba(255,255,255,0.02); border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);';
    
    let modeText = 'Live-Video (MJPEG)';
    if(c.interval === 1) modeText = 'Aktualisierung: 1s';
    else if(c.interval > 1) modeText = `Aktualisierung: ${c.interval}s`;

    row.innerHTML = `
      <div style="display: flex; flex-direction: column; text-align: left; gap: 2px;">
        <span class="t-name" style="font-weight: 700;">${c.name}</span>
        <span class="t-ip" style="font-size: 9px; color: var(--text-muted); word-break: break-all; max-width: 250px;">${c.url.substring(0, 50)}${c.url.length > 50 ? '...' : ''}</span>
        <span style="font-size: 9px; color: var(--primary); font-weight: 600;">${modeText}</span>
      </div>
      <button class="t-btn danger" style="padding: 6px 10px;" onclick="removeCamera('${c.id}')"><i class="fas fa-trash"></i></button>
    `;
    list.appendChild(row);
  });
}

window.removeCamera = async function(id) {
  if(!confirm('Möchtest du diese Kamera wirklich löschen?')) return;
  try {
    const res = await fetch('/api/cameras/' + id, { method: 'DELETE' });
    const data = await res.json();
    if(!data.success) {
      alert('Fehler beim Löschen: ' + (data.error || 'Unbekannter Fehler'));
    }
  } catch(err) {
    console.error('Löschen der Kamera fehlgeschlagen:', err);
  }
};

function renderCameraWidget(cameras) {
  const grid = document.getElementById('cameraGrid');
  if(!grid) return;

  // Alte Intervalle bereinigen um Speicherlecks zu verhindern
  Object.values(activeCameraIntervals).forEach(clearInterval);
  activeCameraIntervals = {};

  grid.className = 'camera-grid';
  grid.innerHTML = '';

  if(cameras.length === 0) {
    grid.innerHTML = '<div class="no-cameras">Keine Kameras eingerichtet.</div>';
    return;
  }

  // Zuweisen des Spaltenlayouts
  if(cameras.length === 1) grid.classList.add('cols-1');
  else if(cameras.length === 2) grid.classList.add('cols-2');
  else grid.classList.add('cols-4'); // 3 oder 4 Kameras

  cameras.forEach(c => {
    const card = document.createElement('div');
    card.className = 'camera-card';
    card.style.cssText = 'position: relative; border-radius: 12px; overflow: hidden; background: rgba(0,0,0,0.4); aspect-ratio: 16/9; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all var(--transition); border: 1px solid rgba(255,255,255,0.06);';
    
    const img = document.createElement('img');
    img.className = 'camera-feed-img';
    img.style.cssText = 'width: 100%; height: 100%; object-fit: cover; transition: filter var(--transition);';
    img.alt = c.name;
    img.src = c.url;

    const liveDot = document.createElement('div');
    liveDot.className = 'camera-live-dot';
    liveDot.style.cssText = 'position: absolute; top: 10px; right: 10px; display: flex; align-items: center; gap: 6px; padding: 4px 8px; background: rgba(0,0,0,0.6); border-radius: 20px; font-size: 8px; font-weight: 700; color: #fff; text-transform: uppercase; z-index: 2; border: 1px solid rgba(255,255,255,0.08);';
    liveDot.innerHTML = '<span class="led-dot red blinking"></span><span>Live</span>';

    const nameBadge = document.createElement('div');
    nameBadge.className = 'camera-name-badge';
    nameBadge.style.cssText = 'position: absolute; bottom: 8px; left: 8px; padding: 4px 8px; background: rgba(15, 18, 37, 0.75); backdrop-filter: blur(8px); border-radius: 6px; font-size: 10px; font-weight: 600; color: #fff; z-index: 2; border: 1px solid rgba(255,255,255,0.08);';
    nameBadge.textContent = c.name;

    card.append(img, liveDot, nameBadge);

    // Klick-Vollbild Handler
    card.addEventListener('click', () => {
      const overlay = document.getElementById('cameraFullscreenOverlay');
      const fsImg = document.getElementById('fullscreenCameraImg');
      const fsTitle = document.getElementById('fullscreenCameraTitle');
      if(overlay && fsImg) {
        if(fullscreenInterval) {
          clearInterval(fullscreenInterval);
          fullscreenInterval = null;
        }

        fsImg.dataset.cameraId = c.id;
        fsImg.src = getTimestampedUrl(c.url);
        if(fsTitle) fsTitle.textContent = c.name;
        overlay.removeAttribute('hidden');

        // Für Vollbild auch einen Refresh-Timer einrichten (im Snapshot-Modus passend, sonst als 4-Minuten-Watchdog)
        const refreshMs = c.interval > 0 ? (c.interval * 1000) : (240 * 1000);
        fullscreenInterval = setInterval(() => {
          fsImg.src = getTimestampedUrl(c.url);
        }, refreshMs);

        fsImg.onerror = () => {
          console.warn(`[Camera Fullscreen Error] Fehler beim Laden des Vollbilds für '${c.name}'.`);
          setTimeout(() => {
            if (!overlay.hasAttribute('hidden')) {
              fsImg.src = getTimestampedUrl(c.url);
            }
          }, 3000);
        };
      }
    });

    // Fehler-Recovery für das Widget-Bild
    img.onerror = () => {
      console.warn(`[Camera Error] Fehler beim Laden des Feeds für '${c.name}'. Versuche Reconnect...`);
      setTimeout(() => {
        if (img.isConnected) {
          img.src = getTimestampedUrl(c.url);
        }
      }, 3000);
    };

    // Intervall einrichten bei Schnappschuss-Modus & Live-Watchdog für MJPEG
    if(c.interval > 0) {
      const intervalMs = c.interval * 1000;
      activeCameraIntervals[c.id] = setInterval(() => {
        img.src = getTimestampedUrl(c.url);
      }, intervalMs);
    } else {
      // Live-Stream Watchdog: alle 4.5 Minuten den Feed refreshen um Hänger / Timeouts im Browser zu beheben
      activeCameraIntervals[c.id] = setInterval(() => {
        console.log(`[Camera Watchdog] Periodischer Auto-Refresh für Live-Kamera '${c.name}'`);
        img.src = getTimestampedUrl(c.url);
      }, 270000);
    }

    grid.appendChild(card);
  });
}
