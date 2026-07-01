import { Config } from './js/modules/config.js';
import { applyTheme, updateDateTime, getLangText } from './js/modules/utils.js';
import { loadWeather } from './js/modules/weather.js';
import { loadICS, initCalendar } from './js/modules/calendar.js';
import { initRadioWidget, initFritzRadioPopup, initRadioWakeGuards, isPlaying, updateRadioUi } from './js/modules/radio.js';
import { initSensorWidget, renderSensorSettings, refreshSensorWidget } from './js/modules/sensors.js';
import { initSystemBargraph } from './js/modules/system.js';
import { initTasmota } from './js/modules/tasmota.js';
import { initFritzbox } from './js/modules/fritzbox.js';
import { initPresence } from './js/modules/presence.js';
import { initCameraWidget } from './js/modules/cameras.js';
import { initJarvis } from './js/modules/jarvis.js';

// Global Socket.io instance
const socket = io();

// Lifecycle Handlers
document.addEventListener('DOMContentLoaded', async () => {
  // Config zuerst laden (server-seitig) + einmalige localStorage-Migration
  await Config.load();
  await Config.migrate();
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
  initRadioWakeGuards();
  initSensorWidget();
  initSystemBargraph(socket);
  initTasmota();
  initFritzbox(socket);
  initPresence(socket);
  initCameraWidget(socket);
  initJarvis();
  initCalendar(socket);
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

  // Sprache laden und anwenden
  let savedLang = Config.get('dashboard_lang');
  if (!savedLang) {
    const browserLang = navigator.language ? navigator.language.split('-')[0] : 'de';
    savedLang = (window.translations && window.translations[browserLang]) ? browserLang : 'de';
  }
  const langSelector = document.getElementById('langSelector');
  if (langSelector) langSelector.value = savedLang;
  if (typeof applyTranslations === 'function') {
    applyTranslations(savedLang);
  }

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
  }

  // Wende Layout aus dem Socket Layer oder lokalen Storage an
  const savedLayout = JSON.parse(localStorage.getItem('widgetLayout') || '[]');
  if(savedLayout && savedLayout.length > 0) {
    const dashboard = document.getElementById('dashboard');
    savedLayout.forEach(type => {
      const widget = dashboard.querySelector(`.widget[data-type="${type}"]`);
      if(widget) dashboard.appendChild(widget);
    });
  }

  // Initiiere Sensor-Einstellungen
  renderSensorSettings();

  ['weather', 'waste', 'calendar', 'player', 'sensor', 'system', 'tasmota', 'fritzbox', 'presence', 'camera', 'jarvis'].forEach(type => {
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

function initSettings() {
  initAccordion();

  // Farbthema Selector Event Listener
  const themeSelector = document.getElementById('themeSelector');
  if (themeSelector) {
    themeSelector.addEventListener('change', (e) => {
      applyTheme(e.target.value);
    });
  }

  // Sprache Selector Event Listener
  const langSelector = document.getElementById('langSelector');
  if (langSelector) {
    langSelector.addEventListener('change', (e) => {
      const selectedLang = e.target.value;
      if (typeof applyTranslations === 'function') {
        applyTranslations(selectedLang);
      }
      updateDateTime();
      loadWeather();
      loadICS();
      updateRadioUi(isPlaying);
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
      fetch('/api/appointments/upload-ics', { method: 'POST', body: formData })
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

  const addSensorRowBtn = document.getElementById('addSensorRowBtn');
  if (addSensorRowBtn) {
    addSensorRowBtn.addEventListener('click', () => {
      const container = document.getElementById('sensorSettingsList');
      if (!container) return;
      const row = document.createElement('div');
      row.className = 'sensor-settings-row';
      row.style.display = 'flex';
      row.style.gap = '8px';
      row.style.alignItems = 'center';
      row.style.marginBottom = '8px';
      row.innerHTML = `
        <input type="text" class="sensor-name-input input-field" style="flex: 1;" placeholder="${getLangText('sensor_name_placeholder') || 'Name'}" value="">
        <input type="text" class="sensor-ip-input input-field" style="flex: 1;" placeholder="z.B. 192.168.178.40" value="">
        <button class="btn btn-danger remove-sensor-btn-new" style="padding: 8px 12px; background: #ef4444;"><i class="fas fa-trash-can"></i></button>
      `;
      container.appendChild(row);

      row.querySelector('.remove-sensor-btn-new').addEventListener('click', () => {
        row.remove();
      });
    });
  }

  const saveSensorsBtn = document.getElementById('saveSensorsBtn');
  if (saveSensorsBtn) {
    saveSensorsBtn.addEventListener('click', async () => {
      const container = document.getElementById('sensorSettingsList');
      if (!container) return;

      const rows = container.querySelectorAll('.sensor-settings-row');
      const newList = [];
      rows.forEach(row => {
        const nameInput = row.querySelector('.sensor-name-input');
        const ipInput = row.querySelector('.sensor-ip-input');
        const name = nameInput ? nameInput.value.trim() : '';
        const ip = ipInput ? ipInput.value.trim() : '';
        if (ip) {
          newList.push({ name: name || 'Sensor', ip });
        }
      });

      await Config.set('sensorList', newList);
      renderSensorSettings();
      await refreshSensorWidget();
    });
  }

  ['weather', 'waste', 'calendar', 'player', 'sensor', 'system', 'tasmota', 'fritzbox', 'presence', 'camera', 'jarvis'].forEach(type => {
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

function initAccordion() {
  const headers = document.querySelectorAll('.accordion-header');
  headers.forEach(header => {
    header.addEventListener('click', () => {
      const isActive = header.classList.contains('active');
      
      headers.forEach(h => {
        h.classList.remove('active');
        if (h.nextElementSibling) h.nextElementSibling.classList.remove('active-body');
      });

      if(!isActive) {
        header.classList.add('active');
        if (header.nextElementSibling) header.nextElementSibling.classList.add('active-body');
      }
    });
  });
}
