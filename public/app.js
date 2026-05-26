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
  loadICS();
  loadRadioSync();
  initAudioPlayer();
  initRadioWakeGuards();
  initTalkWidget();
  initSensorWidget();
  initSystemBargraph();
  initTasmota();
}

let globalStations = [];

function optionElement(value, label) {
  const option = document.createElement('option');
  option.value = value;
  option.textContent = label;
  return option;
}

async function loadRadioSync() {
  try {
    const res = await fetch('/api/radio');
    const data = await res.json();
    if(data && data.stations) {
      globalStations = data.stations;
      renderRadioUI();
    }
  } catch(e) {}
}

socket.on('radio-updated', (data) => {
  if (data && data.stations) {
    globalStations = data.stations;
    renderRadioUI();
  }
});

function assignPreset(slotIndex, url) {
  const presets = JSON.parse(localStorage.getItem('radioPresets') || '{}');
  if(!url) {
      delete presets[slotIndex];
  } else {
      presets[slotIndex] = url;
  }
  localStorage.setItem('radioPresets', JSON.stringify(presets));
  renderRadioUI();
}

function renderRadioUI() {
  // Update Select for compatibility
  const select = document.getElementById('radioStationSelect');
  if(select) {
    // Verhindere unabsichtliche 'Change' Events beim bloßen Aufbau des Dropdowns
    const oldOnchange = select.onchange;
    select.onchange = null;
    
    // Hole den gemerkten Sender anstelle des gerade aktiven, da das Select frisch gerendert wird
    const savedStreamUrl = localStorage.getItem('streamUrl');
    select.replaceChildren(optionElement('', 'Kein Sender gewählt'));
    globalStations.forEach(st => select.appendChild(optionElement(st.url, st.name)));
    
    if(savedStreamUrl && globalStations.find(s => s.url === savedStreamUrl)) {
      select.value = savedStreamUrl;
    } else if (globalStations.length > 0) {
      select.value = ''; // NULLE das initiale Setzen, um Caching/Autoplay-Bugs vom Kiosk zu vermeiden
    }
    
    // Setze das Event, EGAL ob der Sender gefunden wurde oder nicht, erst danach wieder auf aktiv
    setTimeout(() => { select.onchange = oldOnchange; }, 50);
  }

  // Preset Buttons Rendering im Widget
  const presetsContainer = document.getElementById('radioPresetsWidget');
  if(presetsContainer) {
    presetsContainer.innerHTML = '';
    // Hole Preset Mapping aus LocalStorage, z.B. {1: "url", 2: "url"}
    const presets = JSON.parse(localStorage.getItem('radioPresets') || '{}');
    
    for(let i=1; i<=6; i++) {
        const btn = document.createElement('button');
        btn.className = 'btn preset-btn';
        
        let assignedStation = null;
        if(presets[i]) {
            assignedStation = globalStations.find(s => s.url === presets[i]);
        }
        
        if (assignedStation) {
            const number = document.createElement('strong');
            number.textContent = i;
            const label = document.createElement('span');
            label.textContent = assignedStation.name.substring(0, 8);
            btn.replaceChildren(number, label);
            btn.classList.add('assigned');
        } else {
            const number = document.createElement('strong');
            number.textContent = i;
            btn.replaceChildren(number);
            btn.classList.remove('assigned');
        }

        btn.style.width = '45px';
        btn.style.height = '45px';
        btn.style.padding = '0';
        btn.style.display = 'flex';
        btn.style.flexDirection = 'column';
        btn.style.justifyContent = 'center';
        btn.style.alignItems = 'center';

        // Klick auf Preset = Sender abspielen
        btn.addEventListener('click', () => {
            if(presets[i]) {
                localStorage.setItem('streamUrl', presets[i]); // Merken
                // Direkt den Stream starten
                playAudioStream(presets[i], true);
            } else {
                alert(`Speicherplatz ${i} ist leer. Bitte weise in den Dashboard-Einstellungen Sender zu.`);
            }
        });

        presetsContainer.appendChild(btn);
    }
  }

  // Preset Settings Rendering in den Einstellungen
  const presetsSettings = document.getElementById('radioPresetsSettings');
  if(presetsSettings) {
    presetsSettings.innerHTML = '';
    const presets = JSON.parse(localStorage.getItem('radioPresets') || '{}');
    
    for(let i=1; i<=6; i++) {
      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.alignItems = 'center';
      row.style.gap = '10px';
      
      const label = document.createElement('span');
      label.textContent = `Taste ${i}:`;
      label.style.width = '60px';
      label.style.fontSize = '14px';
      
      const sel = document.createElement('select');
      sel.className = 'radio-select';
      sel.style.flex = '1';
      sel.replaceChildren(optionElement('', '- Leer -'));
      globalStations.forEach(st => sel.appendChild(optionElement(st.url, st.name)));
      
      if(presets[i] && globalStations.find(s => s.url === presets[i])) {
        sel.value = presets[i];
      }
      
      sel.addEventListener('change', (e) => {
        assignPreset(i, e.target.value);
      });
      
      row.appendChild(label);
      row.appendChild(sel);
      presetsSettings.appendChild(row);
    }
  }

  // Update Settings List
  const list = document.getElementById('radioList');
  if(list) {
    list.innerHTML = '';
    globalStations.forEach((st, idx) => {
      const row = document.createElement('div');
      row.className = 'tasmota-row';
      const info = document.createElement('div');
      info.className = 't-info';
      const name = document.createElement('span');
      name.className = 't-name';
      name.textContent = st.name;
      const url = document.createElement('span');
      url.className = 't-ip';
      url.textContent = ` ${st.url.substring(0, 35)}${st.url.length > 35 ? '...' : ''}`;
      const button = document.createElement('button');
      button.className = 't-btn danger';
      button.innerHTML = '<i class="fas fa-trash"></i>';
      button.addEventListener('click', () => removeGlobalStation(idx));
      info.append(name, url);
      row.append(info, button);
      list.appendChild(row);
    });
  }
}

async function removeGlobalStation(idx) {
  globalStations.splice(idx, 1);
  try {
    await fetch('/api/radio', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ stations: globalStations })
    });
  } catch(e) {}
}

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

  ['weather', 'waste', 'player', 'talk', 'sensor', 'system', 'tasmota'].forEach(type => {
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

  document.getElementById('updateWeather').addEventListener('click', () => {
    const loc = document.getElementById('weatherLoc').value;
    if (loc) { localStorage.setItem('weatherLoc', loc); loadWeather(); }
  });

  const addStreamBtn = document.getElementById('addStreamBtn');
  if(addStreamBtn) {
    addStreamBtn.addEventListener('click', async () => {
      const name = document.getElementById('streamName').value;
      const url = document.getElementById('streamUrl').value;
      if(name && url) { 
        globalStations.push({ name, url });
        document.getElementById('streamName').value = '';
        document.getElementById('streamUrl').value = '';
        try {
          await fetch('/api/radio', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ stations: globalStations })
          });
        } catch(e) {}
      }
    });
  }

  const stationSelect = document.getElementById('radioStationSelect');
  if(stationSelect) {
    stationSelect.addEventListener('change', (e) => {
      const url = e.target.value;
      if(!url) return;
      localStorage.setItem('streamUrl', url);
      // Wichtig für Fully Kiosk/Android: Senderauswahl darf nur speichern,
      // aber noch KEIN Audio-Element mit Stream-Quelle erzeugen.
      // Einige WebViews starten vorhandene Media-Elemente beim Display-Wakeup sonst eigenständig.
      stopRadioPlayback(true);
    });
  }

  const talkSpeechToggle = document.getElementById('toggleTalkSpeech');
  if(talkSpeechToggle) {
    talkSpeechToggle.checked = localStorage.getItem('talkSpeechEnabled') !== 'false';
    talkSpeechToggle.addEventListener('change', e => localStorage.setItem('talkSpeechEnabled', e.target.checked ? 'true' : 'false'));
  }

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

  ['weather', 'waste', 'player', 'talk', 'sensor', 'system', 'tasmota'].forEach(type => {
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

// ==== WEATHER & ISC & PLAYER ====
async function loadWeather() {
  let locName = localStorage.getItem('weatherLoc') || 'Berlin';
  let lat = 52.52; let lon = 13.41;
  try {
    const geoRes = await (await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(locName)}&count=1&language=de&format=json`)).json();
    if(geoRes.results && geoRes.results.length > 0) { lat = geoRes.results[0].latitude; lon = geoRes.results[0].longitude; locName = geoRes.results[0].name; }
  } catch(e) {}
  try {
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_gusts_10m,precipitation,rain,pressure_msl,cloud_cover` +
      `&daily=temperature_2m_max,temperature_2m_min,uv_index_max,precipitation_probability_max,sunrise,sunset` +
      `&timezone=auto`;
    const d = await (await fetch(weatherUrl)).json();
    document.getElementById('weatherCity').textContent = locName;
    document.querySelector('.weather-temp').innerHTML = Math.round(d.current.temperature_2m) + '&deg;';
    document.getElementById('w-humidity').textContent = d.current.relative_humidity_2m + ' %';
    document.getElementById('w-wind').textContent = Math.round(d.current.wind_speed_10m) + ' km/h';
    document.getElementById('w-minmax').textContent = Math.round(d.daily.temperature_2m_max[0]) + '° / ' + Math.round(d.daily.temperature_2m_min[0]) + '°';
    document.getElementById('w-feels').textContent = Math.round(d.current.apparent_temperature) + '°';
    document.getElementById('w-rain').textContent = (d.daily.precipitation_probability_max?.[0] ?? Math.round((d.current.rain || d.current.precipitation || 0) * 10)) + ' %';
    document.getElementById('w-pressure').textContent = Math.round(d.current.pressure_msl) + ' hPa';
    document.getElementById('w-clouds').textContent = Math.round(d.current.cloud_cover) + ' %';
    document.getElementById('w-uv').textContent = (d.daily.uv_index_max?.[0] ?? 0).toFixed(1);
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
    const cond = conditions[d.current.weather_code] || { text: 'Bedeckt', icon: 'fa-cloud', style: 'cloudy' };
    document.getElementById('weatherCondition').textContent = cond.text;
    document.querySelector('.weather-icon').innerHTML = `<i class="fas ${cond.icon}"></i>`;
    document.querySelector('.weather-icon').className = `weather-icon ${cond.style}`;
  } catch(e) {}
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
      
      if(upcoming.length === 0) { list.innerHTML = '<p style="color:rgba(255,255,255,0.5);">Keine Termine.</p>'; return; }
      
      let html = '<div class="waste-list">';
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
      });
      html += '</div>';
      list.innerHTML = html;
    }
  } catch(e) {}
}

let activeAudioElement = null;

function updateRadioUi(playing) {
  isPlaying = playing;
  const playBtn = document.getElementById('togglePlayBtn');
  const vis = document.querySelector('.visualizer');
  if(playBtn) playBtn.innerHTML = playing ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>';
  if(vis) vis.classList.toggle('active', playing);
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

let talkRecognition = null;
let talkLastText = '';
let talkLastReply = '';
let talkEnabled = false;
let talkTtsPrimed = false;
let talkTtsMode = 'browser';
let talkFullyTtsAvailable = false;

function setTalkStatus(text, busy = false) {
  const status = document.getElementById('talkStatus');
  const orb = document.getElementById('talkMicBtn');
  if(status) status.textContent = text;
  if(orb) orb.classList.toggle('listening', busy);
}

function setTalkTranscript(text) {
  const box = document.getElementById('talkTranscript');
  if(box) box.textContent = text || 'Bereit.';
}

function getTalkVoice() {
  if(!('speechSynthesis' in window)) return null;
  const voices = window.speechSynthesis.getVoices() || [];
  return voices.find(v => /^de[-_]/i.test(v.lang || '')) || voices[0] || null;
}

function primeTalkTts() {
  if(talkTtsPrimed || localStorage.getItem('talkSpeechEnabled') === 'false') return;
  if(!('speechSynthesis' in window) || !window.SpeechSynthesisUtterance) return;
  try {
    const unlock = new SpeechSynthesisUtterance(' ');
    unlock.lang = 'de-DE';
    unlock.volume = 0.01;
    unlock.rate = 1;
    unlock.pitch = 1;
    const voice = getTalkVoice();
    if(voice) unlock.voice = voice;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(unlock);
    talkTtsPrimed = true;
  } catch(e) {}
}

function speakTalkReply(text) {
  if(localStorage.getItem('talkSpeechEnabled') === 'false') return false;
  if(!('speechSynthesis' in window) || !window.SpeechSynthesisUtterance || !text) return false;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'de-DE';
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;
    const voice = getTalkVoice();
    if(voice) utterance.voice = voice;
    utterance.onstart = () => setTalkStatus('Neo spricht ...');
    utterance.onend = () => setTalkStatus('Drücken und sprechen');
    utterance.onerror = () => setTalkStatus('TTS blockiert – Nochmal tippen');
    window.speechSynthesis.speak(utterance);
    return true;
  } catch(e) {
    setTalkStatus('TTS nicht verfügbar');
    return false;
  }
}

function isFullyKioskClient() {
  const ua = navigator.userAgent || '';
  return typeof window.fully !== 'undefined' || /Fully/i.test(ua);
}

async function speakTalkReplyWithFully(text) {
  if(localStorage.getItem('talkSpeechEnabled') === 'false' || !text) return false;
  if(!talkFullyTtsAvailable) return false;
  try {
    const res = await fetch('/api/neo-talk/speak', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    const data = await res.json();
    if(!res.ok || !data.success) throw new Error(data.error || 'Fully TTS fehlgeschlagen');
    return true;
  } catch(e) {
    setTalkStatus('Fully TTS Fehler');
    return false;
  }
}

async function replayTalkReply() {
  if(!talkLastReply) return;
  if(talkTtsMode === 'fully') {
    setTalkStatus('Antwort wird erneut vorgelesen');
    if(await speakTalkReplyWithFully(talkLastReply)) setTalkStatus('Drücken und sprechen');
    return;
  }
  primeTalkTts();
  setTalkStatus('Antwort wird erneut vorgelesen');
  speakTalkReply(talkLastReply);
}

async function sendTalkText(text) {
  const sendBtn = document.getElementById('sendTalkBtn');
  const micBtn = document.getElementById('talkMicBtn');
  if(!text || !talkEnabled) return;
  if(sendBtn) sendBtn.disabled = true;
  if(micBtn) micBtn.disabled = true;
  setTalkStatus('Neo denkt nach ...', true);
  try {
    const res = await fetch('/api/neo-talk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        speak: false
      })
    });
    const data = await res.json();
    if(!res.ok || !data.success) throw new Error(data.error || 'Neo Talk fehlgeschlagen');
    const reply = data.reply || 'Ich habe keine Antwort bekommen.';
    talkLastReply = reply;
    const replayBtn = document.getElementById('replayTalkBtn');
    if(replayBtn) replayBtn.disabled = false;
    setTalkTranscript(`Du: ${data.text}\nNeo: ${reply}`);
    if(talkTtsMode === 'fully') {
      setTalkStatus('Antwort wird vom Tablet vorgelesen');
      if(!await speakTalkReplyWithFully(reply)) setTalkStatus('Antwort da – Nochmal tippen');
    } else {
      setTalkStatus('Antwort wird vorgelesen');
      if(!speakTalkReply(reply)) setTalkStatus('Antwort da – Nochmal tippen');
    }
  } catch(e) {
    setTalkStatus('Fehler');
    setTalkTranscript(e.message || 'Neo konnte gerade nicht antworten.');
  } finally {
    if(micBtn) micBtn.disabled = false;
    if(sendBtn) sendBtn.disabled = !talkLastText;
  }
}

function initSpeechRecognition() {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!Recognition) {
    setTalkStatus('Spracheingabe nicht unterstützt');
    setTalkTranscript('Dieser Browser unterstützt die Web Speech API nicht.');
    return null;
  }
  const recognition = new Recognition();
  recognition.lang = 'de-DE';
  recognition.interimResults = true;
  recognition.continuous = false;
  recognition.maxAlternatives = 1;
  recognition.onstart = () => setTalkStatus('Ich höre zu ...', true);
  recognition.onerror = event => {
    setTalkStatus('Nicht verstanden');
    setTalkTranscript(event.error === 'not-allowed' ? 'Mikrofon-Berechtigung fehlt.' : 'Spracheingabe abgebrochen.');
  };
  recognition.onend = () => {
    setTalkStatus(talkLastText ? 'Erkannt – sende an Neo' : 'Drücken und sprechen');
    if(talkLastText) sendTalkText(talkLastText);
  };
  recognition.onresult = event => {
    let finalText = '';
    let interimText = '';
    for(let i = event.resultIndex; i < event.results.length; i++) {
      const part = event.results[i][0].transcript.trim();
      if(event.results[i].isFinal) finalText += `${part} `;
      else interimText += `${part} `;
    }
    const current = (finalText || interimText).trim();
    if(current) {
      talkLastText = current;
      setTalkTranscript(`Du: ${current}`);
      const sendBtn = document.getElementById('sendTalkBtn');
      if(sendBtn) sendBtn.disabled = false;
    }
  };
  return recognition;
}

async function initTalkWidget() {
  const micBtn = document.getElementById('talkMicBtn');
  const sendBtn = document.getElementById('sendTalkBtn');
  const replayBtn = document.getElementById('replayTalkBtn');
  if(!micBtn) return;
  try {
    const res = await fetch('/api/talk-config');
    const cfg = await res.json();
    talkEnabled = !!cfg.enabled;
    talkFullyTtsAvailable = !!cfg.fullyTtsAvailable;
    talkTtsMode = talkFullyTtsAvailable && isFullyKioskClient() ? 'fully' : (cfg.ttsMode || 'browser');
  } catch(e) {
    talkEnabled = false;
  }
  if(!talkEnabled) {
    micBtn.disabled = true;
    if(sendBtn) sendBtn.disabled = true;
    if(replayBtn) replayBtn.disabled = true;
    setTalkStatus('Serverseitig deaktiviert');
    setTalkTranscript('Neo Talk muss lokal auf dem Dashboard-Server aktiviert werden.');
    return;
  }
  talkRecognition = initSpeechRecognition();
  if(!talkRecognition) {
    micBtn.disabled = true;
    return;
  }
  if('speechSynthesis' in window) {
    window.speechSynthesis.onvoiceschanged = () => getTalkVoice();
  }
  micBtn.addEventListener('click', () => {
    if(talkTtsMode !== 'fully') primeTalkTts();
    talkLastText = '';
    setTalkTranscript('Höre zu ...');
    try { talkRecognition.start(); } catch(e) {}
  });
  if(sendBtn) sendBtn.addEventListener('click', () => {
    if(talkTtsMode !== 'fully') primeTalkTts();
    sendTalkText(talkLastText);
  });
  if(replayBtn) replayBtn.addEventListener('click', () => {
    replayTalkReply();
  });
}

function initAudioPlayer() {
  const playBtn = document.getElementById('togglePlayBtn');
  const vol = document.getElementById('volumeSlider');
  const vis = document.querySelector('.visualizer');
  if(!playBtn) return;
  
  if(vol) {
      vol.addEventListener('input', e => {
          if(activeAudioElement) activeAudioElement.volume = e.target.value / 100;
      });
  }

  playBtn.addEventListener('click', () => {
    if(isPlaying && activeAudioElement) { 
        stopRadioPlayback(true);
    }
    else {
      // Wenn nichts spielt, schnappe den zuletzt aktiven Stream aus unserem State oder LocalStorage
      const u = localStorage.getItem('streamUrl');
      if(u) { 
          playAudioStream(u, true);
      } else {
          alert("Kein Sender ausgewählt.");
      }
    }
  });
}

function playAudioStream(url, autoPlay = false) {
  const container = document.getElementById('audioPlayerContainer');
  if(!container) return;
  if(!autoPlay) return;
  
  // ALLES ABREISSEN
  stopRadioPlayback(true);

  // NEU BAUEN — nur nach explizitem Klick/Touch.
  activeAudioElement = document.createElement('audio');
  activeAudioElement.id = 'audioPlayer';
  activeAudioElement.preload = 'none';
  activeAudioElement.autoplay = false;
  activeAudioElement.controls = false;
  activeAudioElement.setAttribute('playsinline', '');
  
  const vol = document.getElementById('volumeSlider');
  if(vol) activeAudioElement.volume = vol.value / 100;
  
  container.replaceChildren(activeAudioElement);

  if(url.includes('.m3u8')) {
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
  if(!tempEl || !humidityEl) return;

  const ip = localStorage.getItem('sensorIp') || '192.168.178.40';
  try {
    const res = await fetch(`/api/tasmota/sensor?ip=${encodeURIComponent(ip)}`);
    const data = await res.json();
    if(!data.success) throw new Error(data.error || 'Sensor nicht erreichbar');

    const temp = Number(data.temperature);
    const humidity = Number(data.humidity);
    const dew = Number(data.dewPoint);
    tempEl.textContent = Number.isFinite(temp) ? `${temp.toFixed(1)}°` : '--°';
    humidityEl.textContent = Number.isFinite(humidity) ? `${humidity.toFixed(0)}%` : '--%';
    if(dewEl) dewEl.textContent = Number.isFinite(dew) ? `Taupunkt ${dew.toFixed(1)}°` : 'Taupunkt --°';
    if(status) status.textContent = data.time ? data.time.slice(11, 16) : ip;
    setGauge('tempGauge', temp, -10, 40);
    setGauge('humidityGauge', humidity, 0, 100);
  } catch(e) {
    tempEl.textContent = '--°';
    humidityEl.textContent = '--%';
    if(dewEl) dewEl.textContent = 'Taupunkt --°';
    if(status) status.textContent = 'offline';
    setGauge('tempGauge', 0, -10, 40);
    setGauge('humidityGauge', 0, 0, 100);
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
