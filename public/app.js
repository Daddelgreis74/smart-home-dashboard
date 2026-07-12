import { Config } from './js/modules/config.js';
import { applyTheme, updateDateTime, getLangText, playSound } from './js/modules/utils.js';
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
import { initTimer } from './js/modules/timer.js';
// Global Socket.io instance
const socket = io();

document.addEventListener('DOMContentLoaded', async () => {
  // Globaler Audio-Unlock bei der ersten Benutzerinteraktion (verhindert stummen/blockierten AudioContext)
  const unlockAudio = () => {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      const ctx = new AudioContext();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
    }
    document.removeEventListener('click', unlockAudio);
    document.removeEventListener('touchstart', unlockAudio);
  };
  document.addEventListener('click', unlockAudio);
  document.addEventListener('touchstart', unlockAudio);

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

  // Schreibrechte-Warnung einblenden falls der Server Berechtigungsfehler hat
  if (Config.get('server_permission_error')) {
    const banner = document.createElement('div');
    banner.className = 'permission-warning-banner';
    banner.innerHTML = `
      <div style="background-color: #ff3b30; color: #fff; padding: 12px 20px; font-weight: bold; text-align: center; font-size: 14px; box-shadow: 0 4px 6px rgba(0,0,0,0.15); display: flex; align-items: center; justify-content: center; gap: 10px; z-index: 9999; position: relative;">
        <i class="fas fa-exclamation-triangle" style="font-size: 18px;"></i>
        <span>
          <strong>Warnung:</strong> Keine Schreibrechte auf dem Server (/app/data ist schreibgeschützt). 
          Auf TrueNAS SCALE den Besitzer des Datasets rekursiv auf <strong>apps (ID 568)</strong> setzen.
        </span>
      </div>
    `;
    document.body.prepend(banner);
  }
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

  // Timer-Sound laden und anwenden
  const savedTimerSound = localStorage.getItem('timer_alarm_sound') || 'sound-gong';
  const timerSoundSelector = document.getElementById('timerSound');
  if (timerSoundSelector) timerSoundSelector.value = savedTimerSound;

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

  const savedLoc = Config.get('weather_location') || 'Berlin';
  if (document.getElementById('weatherLoc')) document.getElementById('weatherLoc').value = savedLoc;

  const savedProvider = Config.get('weather_provider') || 'openmeteo';
  const providerSelector = document.getElementById('weatherProvider');
  if (providerSelector) {
    providerSelector.value = savedProvider;
    const apiKeyGroup = document.getElementById('weatherApiKeyGroup');
    if (apiKeyGroup) {
      apiKeyGroup.style.display = (savedProvider === 'weatherapi') ? 'block' : 'none';
    }
  }

  const savedKey = Config.get('weather_api_key') || '';
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

  ['weather', 'waste', 'calendar', 'player', 'sensor', 'system', 'tasmota', 'fritzbox', 'presence', 'camera', 'jarvis', 'timer'].forEach(type => {
    const isVisible = localStorage.getItem('show_' + type) !== 'false';
    const widget = document.querySelector(`.widget[data-type="${type}"]`);
    const toggle = document.getElementById('toggle-' + type);
    
    if (toggle) toggle.checked = isVisible;
    if (widget) {
      if (isVisible) { widget.classList.remove('hidden'); widget.style.display = ''; }
      else { widget.classList.add('hidden'); widget.style.display = 'none'; }
    }
  });
  updateSettingsSidebarVisibility();
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
  initTabs();

  // Initialize Timer
  initTimer(socket);

  // Timer Sound Event Listeners
  const timerSoundSelector = document.getElementById('timerSound');
  if (timerSoundSelector) {
    timerSoundSelector.addEventListener('change', (e) => {
      localStorage.setItem('timer_alarm_sound', e.target.value);
    });
  }

  const testTimerSoundBtn = document.getElementById('testTimerSound');
  if (testTimerSoundBtn) {
    testTimerSoundBtn.addEventListener('click', () => {
      const selectedSound = timerSoundSelector ? timerSoundSelector.value : 'sound-gong';
      playSound(selectedSound);
    });
  }

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
    // Reset to general tab when opening
    document.querySelectorAll('.settings-tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.settings-tab-content').forEach(c => c.classList.remove('active'));
    
    const defaultTabBtn = document.querySelector('.settings-tab-btn[data-tab="general"]');
    if (defaultTabBtn) defaultTabBtn.classList.add('active');
    const defaultTabContent = document.getElementById('tab-general');
    if (defaultTabContent) defaultTabContent.classList.add('active');

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

  document.getElementById('updateWeather').addEventListener('click', async () => {
    const loc = document.getElementById('weatherLoc').value.trim();
    const provider = document.getElementById('weatherProvider')?.value || 'openmeteo';
    const apiKey = document.getElementById('weatherApiKey')?.value.trim() || '';
    
    const updateObj = {
      weather_location: loc || 'Berlin',
      weather_provider: provider
    };

    if (apiKey !== '********') {
      updateObj.weather_api_key = apiKey;
    }

    await Config.setMany(updateObj);
    
    // Clear weather cache on the server
    try {
      await fetch('/api/weather/clear-cache', { method: 'POST' });
    } catch (e) {}

    // Optische Bestätigung auf dem Button
    const updateWeatherBtn = document.getElementById('updateWeather');
    if (updateWeatherBtn) {
      const originalHtml = updateWeatherBtn.innerHTML;
      const originalStyle = updateWeatherBtn.style.cssText;
      updateWeatherBtn.disabled = true;
      updateWeatherBtn.style.backgroundColor = '#22c55e';
      updateWeatherBtn.style.color = '#fff';
      updateWeatherBtn.style.borderColor = '#22c55e';
      updateWeatherBtn.innerHTML = `<i class="fas fa-check"></i> <span>${getLangText('saved') || 'Gespeichert!'}</span>`;

      setTimeout(() => {
        updateWeatherBtn.disabled = false;
        updateWeatherBtn.innerHTML = originalHtml;
        updateWeatherBtn.style.cssText = originalStyle;
      }, 2000);
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

      // Premium visuelle Rückmeldung auf dem Button
      const originalHtml = saveSensorsBtn.innerHTML;
      const originalStyle = saveSensorsBtn.style.cssText;
      saveSensorsBtn.disabled = true;
      saveSensorsBtn.style.backgroundColor = '#22c55e';
      saveSensorsBtn.style.color = '#fff';
      saveSensorsBtn.style.borderColor = '#22c55e';
      saveSensorsBtn.innerHTML = `<i class="fas fa-check"></i> <span>${getLangText('saved') || 'Gespeichert!'}</span>`;

      setTimeout(() => {
        saveSensorsBtn.disabled = false;
        saveSensorsBtn.innerHTML = originalHtml;
        saveSensorsBtn.style.cssText = originalStyle;
      }, 2000);
    });
  }

  ['weather', 'waste', 'calendar', 'player', 'sensor', 'system', 'tasmota', 'fritzbox', 'presence', 'camera', 'jarvis', 'timer'].forEach(type => {
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
        updateSettingsSidebarVisibility();
      });
    }
  });

  const settingsSearch = document.getElementById('settingsSearch');
  if (settingsSearch) {
    settingsSearch.addEventListener('input', () => {
      updateSettingsSidebarVisibility();
    });
  }

  // Factory Reset Dialog Event Listeners
  const resetTriggerBtn = document.getElementById('factoryResetTriggerBtn');
  const resetModal = document.getElementById('factoryResetModal');
  const closeResetBtn = document.getElementById('closeResetModal');
  const cancelResetBtn = document.getElementById('cancelResetBtn');
  const confirmResetBtn = document.getElementById('confirmResetBtn');
  const resetConfirmCheckbox = document.getElementById('resetConfirmCheckbox');

  let countdownInterval = null;

  if (resetTriggerBtn && resetModal) {
    // Offnen
    resetTriggerBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      // Reset state of modal controls
      resetConfirmCheckbox.checked = false;
      confirmResetBtn.disabled = true;
      confirmResetBtn.style.cursor = 'not-allowed';
      confirmResetBtn.innerText = 'Zurücksetzen (10s)';
      if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
      }

      // Sicherheits-Token vorab laden
      try {
        const tokenRes = await fetch('/api/config/factory-reset-token');
        const tokenData = await tokenRes.json();
        window.activeResetToken = tokenData.token;
      } catch (tokenErr) {
        console.error('Sicherheits-Token konnte nicht geladen werden:', tokenErr);
        window.activeResetToken = null;
      }

      resetModal.removeAttribute('hidden');
    });

    // Schließen / Abbrechen
    const closeModal = () => {
      if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
      }
      resetModal.setAttribute('hidden', '');
    };

    if (closeResetBtn) closeResetBtn.addEventListener('click', closeModal);
    if (cancelResetBtn) cancelResetBtn.addEventListener('click', closeModal);

    // Checkbox Listener
    resetConfirmCheckbox.addEventListener('change', () => {
      if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
      }

      if (resetConfirmCheckbox.checked) {
        let secondsLeft = 10;
        confirmResetBtn.innerText = `Zurücksetzen (${secondsLeft}s)`;
        confirmResetBtn.disabled = true;
        confirmResetBtn.style.cursor = 'not-allowed';

        countdownInterval = setInterval(() => {
          secondsLeft--;
          if (secondsLeft > 0) {
            confirmResetBtn.innerText = `Zurücksetzen (${secondsLeft}s)`;
          } else {
            clearInterval(countdownInterval);
            countdownInterval = null;
            confirmResetBtn.innerText = 'Jetzt zurücksetzen';
            confirmResetBtn.disabled = false;
            confirmResetBtn.style.cursor = 'pointer';
          }
        }, 1000);
      } else {
        confirmResetBtn.innerText = 'Zurücksetzen (10s)';
        confirmResetBtn.disabled = true;
        confirmResetBtn.style.cursor = 'not-allowed';
      }
    });

    // Reset ausführen
    confirmResetBtn.addEventListener('click', async () => {
      if (confirmResetBtn.disabled) return;
      try {
        confirmResetBtn.disabled = true;
        confirmResetBtn.innerText = 'Wird zurückgesetzt...';
        
        const response = await fetch('/api/config/factory-reset', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ token: window.activeResetToken || '' })
        });

        const result = await response.json();
        if (result.ok) {
          // Clear localStorage so local settings (theme, layout, etc.) are also wiped!
          localStorage.clear();
          
          alert('Das Dashboard wurde erfolgreich auf Werkseinstellungen zurückgesetzt! Die Seite lädt jetzt neu.');
          window.location.reload();
        } else {
          alert('Fehler beim Zurücksetzen: ' + (result.error || 'Unbekannter Fehler'));
          confirmResetBtn.disabled = false;
          confirmResetBtn.innerText = 'Jetzt zurücksetzen';
        }
      } catch (err) {
        alert('Netzwerkfehler beim Zurücksetzen: ' + err.message);
        confirmResetBtn.disabled = false;
        confirmResetBtn.innerText = 'Jetzt zurücksetzen';
      }
    });
  }
}

function initTabs() {
  document.querySelectorAll('.settings-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.settings-tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.settings-tab-content').forEach(c => c.classList.remove('active'));
      
      btn.classList.add('active');
      const tabId = `tab-${btn.dataset.tab}`;
      const content = document.getElementById(tabId);
      if (content) content.classList.add('active');
    });
  });
}

function updateSettingsSidebarVisibility() {
  const showTasmota = localStorage.getItem('show_tasmota') !== 'false';
  const showSensor = localStorage.getItem('show_sensor') !== 'false';
  const showWeather = localStorage.getItem('show_weather') !== 'false';
  const showWaste = localStorage.getItem('show_waste') !== 'false';
  const showCalendar = localStorage.getItem('show_calendar') !== 'false';
  const showPresence = localStorage.getItem('show_presence') !== 'false';
  const showCamera = localStorage.getItem('show_camera') !== 'false';
  const showJarvis = localStorage.getItem('show_jarvis') !== 'false';
  const showFritzbox = localStorage.getItem('show_fritzbox') !== 'false';

  const tabVisibility = {
    general: true,
    smarthome: showTasmota || showSensor,
    weather: showWeather || showWaste || showCalendar,
    presence: showPresence,
    camera: showCamera,
    jarvis: showJarvis,
    fritzbox: showFritzbox
  };

  const searchQuery = document.getElementById('settingsSearch')?.value.toLowerCase().trim() || '';

  const activeTabBtn = document.querySelector('.settings-tab-btn.active');
  let activeTabStillVisible = true;

  document.querySelectorAll('.settings-tab-btn').forEach(btn => {
    const tabName = btn.dataset.tab;
    const isActive = tabVisibility[tabName] !== false;
    
    let matchesSearch = true;
    if (searchQuery) {
      const tabText = btn.textContent.toLowerCase();
      matchesSearch = tabText.includes(searchQuery);
    }

    const isVisible = (tabName === 'general') ? (searchQuery ? matchesSearch : true) : (isActive && matchesSearch);

    if (isVisible) {
      btn.style.display = '';
    } else {
      btn.style.display = 'none';
      if (activeTabBtn === btn) {
        activeTabStillVisible = false;
      }
    }
  });

  if (!activeTabStillVisible) {
    const generalTabBtn = document.querySelector('.settings-tab-btn[data-tab="general"]');
    if (generalTabBtn) {
      generalTabBtn.click();
    }
  }
}
