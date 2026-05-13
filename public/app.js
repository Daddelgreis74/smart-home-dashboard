const socket = io();
let hlsCore = null;
let isPlaying = false;

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
  initAudioPlayer();
  initSystemBargraph();
  initTasmota();
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
  const savedLoc = localStorage.getItem('weatherLoc');
  if (savedLoc) document.getElementById('weatherLoc').value = savedLoc;
  
  const savedStream = localStorage.getItem('streamUrl');
  if (savedStream) {
    document.getElementById('streamUrl').value = savedStream;
    playAudioStream(savedStream); 
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

  ['weather', 'waste', 'player', 'system'].forEach(type => {
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

  document.getElementById('saveStream').addEventListener('click', () => {
    const url = document.getElementById('streamUrl').value;
    if(url) { 
      localStorage.setItem('streamUrl', url); playAudioStream(url);
      const audio = document.getElementById('audioPlayer');
      audio.play().then(() => {
        isPlaying = true;
        document.getElementById('togglePlayBtn').innerHTML = '<i class="fas fa-pause"></i>';
        document.querySelector('.visualizer').classList.add('active');
      }).catch(e=>{});
    }
  });

  ['weather', 'waste', 'player', 'system'].forEach(type => {
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
    const d = await (await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min&timezone=auto`)).json();
    document.getElementById('weatherCity').textContent = locName;
    document.querySelector('.weather-temp').innerHTML = Math.round(d.current.temperature_2m) + '&deg;';
    document.getElementById('w-humidity').textContent = d.current.relative_humidity_2m + ' %';
    document.getElementById('w-wind').textContent = Math.round(d.current.wind_speed_10m) + ' km/h';
    document.getElementById('w-minmax').textContent = Math.round(d.daily.temperature_2m_max[0]) + '° / ' + Math.round(d.daily.temperature_2m_min[0]) + '°';
    const conditions = { 0:{text:'Klar',icon:'fa-sun',style:'sunny'}, 3:{text:'Bewölkt',icon:'fa-cloud',style:'cloudy'}, 61:{text:'Regen',icon:'fa-cloud-rain',style:'rainy'}, 71:{text:'Schnee',icon:'fa-snowflake',style:'cloudy'} };
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
      
      const today = new Date();
      const todayStr = today.getFullYear() + String(today.getMonth()+1).padStart(2,'0') + String(today.getDate()).padStart(2,'0');
      const upcoming = events.filter(e => e.date >= todayStr).slice(0, 4);
      
      if(upcoming.length === 0) { list.innerHTML = '<p style="color:rgba(255,255,255,0.5);">Keine Termine.</p>'; return; }
      
      let html = '<div class="waste-list">';
      upcoming.forEach(e => {
        const dt = new Date(e.date.substring(0,4), e.date.substring(4,6)-1, e.date.substring(6,8));
        let type = 'residual'; const s = e.summary.toLowerCase();
        if(s.includes('bio')) type = 'bio'; else if(s.includes('papier')) type = 'paper'; else if(s.includes('gelb')||s.includes('plastik')) type = 'plastic';
        let dateStr = dt.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' });
        const diff = Math.floor((dt - today) / (1000 * 60 * 60 * 24));
        if(diff === 0) dateStr = 'Heute'; else if(diff === 1) dateStr = 'Morgen';

        html += `
          <div class="waste-item ${type}">
            <div style="display:flex; align-items:center; gap: 12px;">
              <i class="fas fa-trash-can icon-${type}"></i>
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

function initAudioPlayer() {
  const audio = document.getElementById('audioPlayer');
  const playBtn = document.getElementById('togglePlayBtn');
  const vol = document.getElementById('volumeSlider');
  const vis = document.querySelector('.visualizer');
  if(!playBtn||!audio) return;
  vol.addEventListener('input', e => audio.volume = e.target.value/100);
  playBtn.addEventListener('click', () => {
    if(isPlaying) { audio.pause(); isPlaying=false; playBtn.innerHTML='<i class="fas fa-play"></i>'; vis.classList.remove('active');}
    else {
      const u = localStorage.getItem('streamUrl');
      if(u) { if(!audio.src||audio.src!==u) playAudioStream(u);
        audio.play().then(()=>{isPlaying=true; playBtn.innerHTML='<i class="fas fa-pause"></i>'; vis.classList.add('active');}).catch();
      }
    }
  });
}

function playAudioStream(url) {
  const a = document.getElementById('audioPlayer'); if(!a) return;
  if(hlsCore) { hlsCore.destroy(); hlsCore=null; }
  if(url.includes('.m3u8')) {
    if(Hls.isSupported()){ hlsCore=new Hls(); hlsCore.loadSource(url); hlsCore.attachMedia(a); }
    else if(a.canPlayType('application/vnd.apple.mpegurl')) a.src=url;
  } else a.src=url;
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
      if(data.state === 'ON') btn.classList.add('active');
      else btn.classList.remove('active');
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
    div.innerHTML = `<span><b>${d.name}</b> <small>(${d.ip})</small></span>
                     <button onclick="window.removeTasmota('${d.ip}')" class="btn-del"><i class="fas fa-trash"></i></button>`;
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
    btn.innerHTML = `<i class="fas fa-power-off"></i> <span>${d.name}</span>`;
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
        if(!s.online) { btn.classList.remove('active'); btn.style.opacity = '0.5'; }
        else {
          btn.style.opacity = '1';
          if(s.state === 'ON') btn.classList.add('active');
          else btn.classList.remove('active');
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