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
import { initNote, setNoteTheme } from './js/modules/note.js';
// Global Socket.io instance
const socket = io();
window.socket = socket;

const WIDGET_TYPES = [
  'weather', 'sensor', 'waste', 'calendar', 'player', 
  'system', 'tasmota', 'fritzbox', 'presence', 'camera', 
  'jarvis', 'timer', 'note'
];

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
  
  // Module isoliert initialisieren, damit ein einzelner Widget-Fehler nicht das gesamte Dashboard blockiert
  const initializers = [
    () => initRadioWidget(socket),
    () => initFritzRadioPopup(),
    () => initRadioWakeGuards(),
    () => initSensorWidget(socket),
    () => initSystemBargraph(socket),
    () => initTasmota(),
    () => initFritzbox(socket),
    () => initPresence(socket),
    () => initCameraWidget(socket),
    () => initJarvis(),
    () => initCalendar(socket),
    () => initNote(socket)
  ];

  initializers.forEach(fn => {
    try {
      fn();
    } catch (err) {
      console.error('[Dashboard Module Init Error]', err);
    }
  });

  // Version Badge – laedt die aktuelle Version vom Server und zeigt sie im Header an
  fetch('/api/version')
    .then(r => r.json())
    .then(({ version }) => {
      const badge = document.getElementById('headerVersionBadge');
      if (badge) badge.textContent = `v${version}`;
    })
    .catch(() => { /* Badge bleibt leer wenn nicht erreichbar */ });

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
  if (!window.Sortable || !dashboard) return;
  
  window.dashboardSortable = Sortable.create(dashboard, {
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

  const currentMode = localStorage.getItem('dashboard_view_mode') || 'grid';
  if (currentMode === 'carousel' && window.dashboardSortable) {
    window.dashboardSortable.option('disabled', true);
  }
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

  const presenceSoundToggle = document.getElementById('presenceSoundEnabled');
  if (presenceSoundToggle) {
    const isSoundEnabled = Config.get('presence_sound_enabled', true);
    presenceSoundToggle.checked = (isSoundEnabled === true || isSoundEnabled === 'true');
  }

  // Wende Layout aus dem Socket Layer oder lokalen Storage an
  const savedLayout = JSON.parse(localStorage.getItem('widgetLayout') || '[]');
  if(savedLayout && savedLayout.length > 0) {
    const dashboard = document.getElementById('dashboard');
    savedLayout.forEach(type => {
      const widget = dashboard.querySelector(`.widget[data-type="${type}"]`);
      if(widget) dashboard.appendChild(widget);
    });
    // Neue Widgets, die noch nicht im gespeicherten Layout existieren, ans Ende anfügen
    WIDGET_TYPES.forEach(type => {
      if (!savedLayout.includes(type)) {
        const widget = dashboard.querySelector(`.widget[data-type="${type}"]`);
        if(widget) dashboard.appendChild(widget);
      }
    });
  }

  // Initiiere Sensor-Einstellungen
  renderSensorSettings();

  WIDGET_TYPES.forEach(type => {
    const isVisible = localStorage.getItem('show_' + type) !== 'false';
    const widget = document.querySelector(`.widget[data-type="${type}"]`);
    const toggle = document.getElementById('toggle-' + type);
    
    if (toggle) toggle.checked = isVisible;
    if (widget) {
      widget.classList.toggle('hidden', !isVisible);
      if (isVisible) {
        widget.style.display = '';
      } else {
        widget.style.setProperty('display', 'none', 'important');
        widget.classList.remove('active', 'prev-1', 'next-1', 'prev-2', 'next-2', 'hidden-left', 'hidden-right', 'fullscreen');
      }
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
    // Reset to viewmode tab when opening
    document.querySelectorAll('.settings-tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.settings-tab-content').forEach(c => c.classList.remove('active'));
    
    const defaultTabBtn = document.querySelector('.settings-tab-btn[data-tab="viewmode"]') || document.querySelector('.settings-tab-btn[data-tab="general"]');
    if (defaultTabBtn) defaultTabBtn.classList.add('active');
    const defaultTabContent = document.getElementById('tab-viewmode') || document.getElementById('tab-general');
    if (defaultTabContent) defaultTabContent.classList.add('active');

    initViewModeSettingsUI();

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

  function setWidgetVisibility(type, isVisible) {
    localStorage.setItem('show_' + type, isVisible ? 'true' : 'false');
    const widget = document.querySelector(`.widget[data-type="${type}"]`);
    const toggle = document.getElementById('toggle-' + type);

    if (toggle && toggle.checked !== isVisible) {
      toggle.checked = isVisible;
    }

    if (widget) {
      widget.classList.toggle('hidden', !isVisible);
      if (isVisible) {
        widget.style.display = '';
      } else {
        widget.style.setProperty('display', 'none', 'important');
        widget.classList.remove('active', 'prev-1', 'next-1', 'prev-2', 'next-2', 'hidden-left', 'hidden-right', 'fullscreen');
        if (typeof isCardFullscreen !== 'undefined' && isCardFullscreen && fullscreenWidget === widget) {
          closeWidgetFullscreen();
        }
      }
    }

    updateSettingsSidebarVisibility();

    // Karussell-Ansicht sofort live neu synchronisieren
    const currentMode = localStorage.getItem('dashboard_view_mode') || 'grid';
    if (currentMode === 'carousel' && typeof renderCarousel === 'function') {
      const visibleWidgets = getVisibleWidgets();
      if (typeof carouselCurrentIndex !== 'undefined' && carouselCurrentIndex >= visibleWidgets.length) {
        carouselCurrentIndex = Math.max(0, visibleWidgets.length - 1);
      }
      if (typeof initCarouselPills === 'function') {
        initCarouselPills();
      }
      renderCarousel();
    }
  }
  window.setWidgetVisibility = setWidgetVisibility;

  WIDGET_TYPES.forEach(type => {
    const toggle = document.getElementById('toggle-' + type);
    if (!toggle) return;

    toggle.addEventListener('change', (e) => {
      setWidgetVisibility(type, e.target.checked);
    });
  });

  const noteColorSelect = document.getElementById('settingNoteColor');
  if (noteColorSelect) {
    const currentTheme = localStorage.getItem('note_theme') || 'yellow';
    noteColorSelect.value = currentTheme;
    noteColorSelect.addEventListener('change', (e) => {
      setNoteTheme(e.target.value);
    });
  }

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
  const showTimer = localStorage.getItem('show_timer') !== 'false';
  const showNote = localStorage.getItem('show_note') !== 'false';

  const tabVisibility = {
    viewmode: true,
    general: true,
    smarthome: showTasmota,
    weather: showWeather,
    sensor: showSensor,
    waste: showWaste,
    reminder: showCalendar,
    presence: showPresence,
    camera: showCamera,
    jarvis: showJarvis,
    fritzbox: showFritzbox,
    timer: showTimer,
    note: showNote
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

    const isVisible = (tabName === 'general' || tabName === 'viewmode') ? (searchQuery ? matchesSearch : true) : (isActive && matchesSearch);

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
    const fallbackTabBtn = document.querySelector('.settings-tab-btn[data-tab="viewmode"]') || document.querySelector('.settings-tab-btn[data-tab="general"]');
    if (fallbackTabBtn) {
      fallbackTabBtn.click();
    }
  }
}

// ==========================================
// DASHBOARD VIEW MODE (GRID vs CAROUSEL)
// ==========================================

function initViewModeSettingsUI() {
  const currentMode = localStorage.getItem('dashboard_view_mode') || 'grid';
  const showToggle = localStorage.getItem('dashboard_show_view_toggle') !== 'false';
  const infiniteLoop = localStorage.getItem('dashboard_carousel_infinite') !== 'false';
  const tapFullscreen = localStorage.getItem('dashboard_carousel_fullscreen') !== 'false';

  const cardGrid = document.getElementById('settingsCardGrid');
  const cardCarousel = document.getElementById('settingsCardCarousel');
  if (cardGrid && cardCarousel) {
    cardGrid.classList.toggle('selected', currentMode === 'grid');
    cardCarousel.classList.toggle('selected', currentMode === 'carousel');
  }

  const toggleShow = document.getElementById('settingShowViewToggle');
  if (toggleShow) toggleShow.checked = showToggle;

  const toggleInfinite = document.getElementById('settingCarouselInfinite');
  if (toggleInfinite) toggleInfinite.checked = infiniteLoop;

  const toggleFs = document.getElementById('settingCarouselTapFullscreen');
  if (toggleFs) toggleFs.checked = tapFullscreen;
}

function applyViewMode(mode) {
  const validMode = (mode === 'carousel') ? 'carousel' : 'grid';
  localStorage.setItem('dashboard_view_mode', validMode);

  document.body.classList.remove('view-grid', 'view-carousel');
  document.body.classList.add(`view-${validMode}`);

  const btn = document.getElementById('btnViewToggle');
  if (btn) {
    const showToggle = localStorage.getItem('dashboard_show_view_toggle') !== 'false';
    btn.style.display = showToggle ? '' : 'none';
    if (validMode === 'carousel') {
      btn.innerHTML = '<i class="fas fa-th-large"></i>';
      btn.title = 'Zu Kachelraster wechseln';
    } else {
      btn.innerHTML = '<i class="fas fa-layer-group"></i>';
      btn.title = 'Zu Deck-Karussell wechseln';
    }
  }

  const cardGrid = document.getElementById('settingsCardGrid');
  const cardCarousel = document.getElementById('settingsCardCarousel');
  if (cardGrid && cardCarousel) {
    cardGrid.classList.toggle('selected', validMode === 'grid');
    cardCarousel.classList.toggle('selected', validMode === 'carousel');
  }

  window.dispatchEvent(new CustomEvent('viewmodechange', { detail: { mode: validMode } }));
}

let viewModeInitialized = false;
function initViewMode() {
  if (viewModeInitialized) return;
  viewModeInitialized = true;

  const initialMode = localStorage.getItem('dashboard_view_mode') || 'grid';
  applyViewMode(initialMode);

  // Schnellumschalter im Header
  const btnViewToggle = document.getElementById('btnViewToggle');
  if (btnViewToggle) {
    btnViewToggle.addEventListener('click', () => {
      const current = localStorage.getItem('dashboard_view_mode') || 'grid';
      const nextMode = (current === 'grid') ? 'carousel' : 'grid';
      applyViewMode(nextMode);
    });
  }

  // Klick auf Auswahlkarten im Einstellungs-Dialog
  const cardGrid = document.getElementById('settingsCardGrid');
  const cardCarousel = document.getElementById('settingsCardCarousel');
  if (cardGrid && cardCarousel) {
    cardGrid.addEventListener('click', () => {
      cardGrid.classList.add('selected');
      cardCarousel.classList.remove('selected');
    });
    cardCarousel.addEventListener('click', () => {
      cardCarousel.classList.add('selected');
      cardGrid.classList.remove('selected');
    });
  }

  // Speichern-Button
  const saveBtn = document.getElementById('saveViewModeSettings');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      const isCarousel = cardCarousel && cardCarousel.classList.contains('selected');
      const targetMode = isCarousel ? 'carousel' : 'grid';

      const showToggle = document.getElementById('settingShowViewToggle')?.checked ?? true;
      const infiniteLoop = document.getElementById('settingCarouselInfinite')?.checked ?? true;
      const tapFullscreen = document.getElementById('settingCarouselTapFullscreen')?.checked ?? true;

      localStorage.setItem('dashboard_show_view_toggle', showToggle ? 'true' : 'false');
      localStorage.setItem('dashboard_carousel_infinite', infiniteLoop ? 'true' : 'false');
      localStorage.setItem('dashboard_carousel_fullscreen', tapFullscreen ? 'true' : 'false');

      applyViewMode(targetMode);
      alert('Dashboard-Ansicht Einstellungen gespeichert.');
    });
  }
}

// ==========================================================================
// DECK-CAROUSEL (COVERFLOW 3D) ENGINE & FULLSCREEN ZOOM
// ==========================================================================
let carouselInitialized = false;
let carouselCurrentIndex = 0;
const carouselPrevOffsets = new Map();
let isCardFullscreen = false;
let fullscreenWidget = null;
let carouselSwipeActive = false;
let carouselDidSwipe = false;
let carouselStartX = 0;
let carouselCurrentX = 0;
let carouselStartTime = 0;

function getVisibleWidgets() {
  const dashboard = document.getElementById('dashboard');
  if (!dashboard) return [];
  return Array.from(dashboard.querySelectorAll('.widget')).filter(w => {
    return !w.classList.contains('hidden') && w.style.display !== 'none';
  });
}

function getCircularOffset(idx, current, total) {
  let diff = (idx - current) % total;
  if (diff > total / 2) diff -= total;
  if (diff < -total / 2) diff += total;
  return diff;
}

function renderCarousel() {
  const currentMode = localStorage.getItem('dashboard_view_mode') || 'grid';
  if (currentMode !== 'carousel') return;

  // Versteckte Widgets von Karussell-Klassen säubern, damit keine Geister-Karten bleiben
  const dashboard = document.getElementById('dashboard');
  if (dashboard) {
    dashboard.querySelectorAll('.widget.hidden, .widget[style*="display: none"], .widget[style*="display:none"]').forEach(w => {
      w.classList.remove('active', 'prev-1', 'next-1', 'prev-2', 'next-2', 'hidden-left', 'hidden-right', 'fullscreen');
      w.style.visibility = 'hidden';
      w.style.pointerEvents = 'none';
    });
  }

  const widgets = getVisibleWidgets();
  const total = widgets.length;
  if (total === 0) {
    const pillsContainer = document.getElementById('carouselPills');
    if (pillsContainer) pillsContainer.innerHTML = '';
    const prevBtn = document.getElementById('carouselNavPrev');
    const nextBtn = document.getElementById('carouselNavNext');
    if (prevBtn) prevBtn.style.opacity = '0';
    if (nextBtn) nextBtn.style.opacity = '0';
    return;
  }

  const infinite = localStorage.getItem('dashboard_carousel_infinite') !== 'false';
  if (carouselCurrentIndex >= total) carouselCurrentIndex = Math.max(0, total - 1);
  if (carouselCurrentIndex < 0) carouselCurrentIndex = 0;

  widgets.forEach((card, idx) => {
    let offset = 0;
    if (infinite) {
      offset = getCircularOffset(idx, carouselCurrentIndex, total);
    } else {
      offset = idx - carouselCurrentIndex;
    }

    const lastOffset = carouselPrevOffsets.get(idx);
    const isTeleporting = (infinite && lastOffset !== undefined && Math.abs(offset) >= 3 && Math.abs(lastOffset) >= 3 && Math.sign(offset) !== Math.sign(lastOffset));

    card.classList.remove('active', 'prev-1', 'next-1', 'prev-2', 'next-2', 'hidden-left', 'hidden-right');
    if (isTeleporting) card.classList.add('no-transition');

    if (offset === 0) {
      card.classList.add('active');
    } else if (offset === -1) {
      card.classList.add('prev-1');
    } else if (offset === 1) {
      card.classList.add('next-1');
    } else if (offset === -2) {
      card.classList.add('prev-2');
    } else if (offset === 2) {
      card.classList.add('next-2');
    } else if (offset <= -3) {
      card.classList.add('hidden-left');
    } else if (offset >= 3) {
      card.classList.add('hidden-right');
    }

    if (Math.abs(offset) >= 3) {
      card.style.visibility = 'hidden';
      card.style.pointerEvents = 'none';
    } else {
      card.style.visibility = '';
      card.style.pointerEvents = '';
    }

    if (isTeleporting) {
      void card.offsetWidth;
      requestAnimationFrame(() => {
        card.classList.remove('no-transition');
      });
    }

    carouselPrevOffsets.set(idx, offset);
  });

  // Update Navigation-Pills
  const pillsContainer = document.getElementById('carouselPills');
  if (pillsContainer) {
    const pills = pillsContainer.querySelectorAll('.carousel-pill');
    pills.forEach((pill, idx) => {
      pill.classList.toggle('active', idx === carouselCurrentIndex);
    });
  }

  // Pfeil-Buttons ggf. deaktivieren wenn kein Endlos-Scrollen
  const prevBtn = document.getElementById('carouselNavPrev');
  const nextBtn = document.getElementById('carouselNavNext');
  if (prevBtn && nextBtn) {
    if (!infinite) {
      prevBtn.style.opacity = carouselCurrentIndex === 0 ? '0.3' : '1';
      prevBtn.style.pointerEvents = carouselCurrentIndex === 0 ? 'none' : 'auto';
      nextBtn.style.opacity = carouselCurrentIndex === total - 1 ? '0.3' : '1';
      nextBtn.style.pointerEvents = carouselCurrentIndex === total - 1 ? 'none' : 'auto';
    } else {
      prevBtn.style.opacity = '1';
      prevBtn.style.pointerEvents = 'auto';
      nextBtn.style.opacity = '1';
      nextBtn.style.pointerEvents = 'auto';
    }
  }
}

function carouselGoTo(index) {
  const widgets = getVisibleWidgets();
  const total = widgets.length;
  if (total === 0) return;
  const infinite = localStorage.getItem('dashboard_carousel_infinite') !== 'false';
  if (infinite) {
    carouselCurrentIndex = ((index % total) + total) % total;
  } else {
    carouselCurrentIndex = Math.max(0, Math.min(total - 1, index));
  }
  renderCarousel();
}

function carouselNext() {
  carouselGoTo(carouselCurrentIndex + 1);
}

function carouselPrev() {
  carouselGoTo(carouselCurrentIndex - 1);
}

function openWidgetFullscreen(widget) {
  if (isCardFullscreen) return;
  isCardFullscreen = true;
  fullscreenWidget = widget;
  document.body.classList.add('card-fullscreen-mode');
  widget.classList.add('fullscreen');

  const zoomBtn = widget.querySelector('.widget-carousel-zoom-btn i');
  if (zoomBtn) {
    zoomBtn.className = 'fas fa-compress';
  }

  // Canvas / Resize Event triggern
  window.dispatchEvent(new Event('resize'));
}

function closeWidgetFullscreen() {
  if (!isCardFullscreen) return;
  isCardFullscreen = false;
  document.body.classList.remove('card-fullscreen-mode');
  if (fullscreenWidget) {
    fullscreenWidget.classList.remove('fullscreen');
    const zoomBtn = fullscreenWidget.querySelector('.widget-carousel-zoom-btn i');
    if (zoomBtn) {
      zoomBtn.className = 'fas fa-expand';
    }
    fullscreenWidget = null;
  }
  window.dispatchEvent(new Event('resize'));
}

function toggleWidgetFullscreen(widget) {
  if (isCardFullscreen) {
    closeWidgetFullscreen();
  } else {
    openWidgetFullscreen(widget);
  }
}

function initCarouselPills() {
  const pillsContainer = document.getElementById('carouselPills');
  if (!pillsContainer) return;
  pillsContainer.innerHTML = '';

  const widgets = getVisibleWidgets();
  widgets.forEach((w, idx) => {
    const titleSpan = w.querySelector('.widget-header h3 span');
    const iconEl = w.querySelector('.widget-header h3 i');
    const title = titleSpan ? titleSpan.textContent.trim() : (w.dataset.type || `Widget ${idx + 1}`);
    const iconClass = iconEl ? iconEl.className : 'fas fa-th';

    const pill = document.createElement('div');
    pill.className = `carousel-pill ${idx === carouselCurrentIndex ? 'active' : ''}`;
    pill.innerHTML = `<i class="${iconClass}"></i> <span>${title}</span>`;
    pill.addEventListener('click', (e) => {
      e.stopPropagation();
      carouselGoTo(idx);
    });
    pillsContainer.appendChild(pill);
  });
}

function injectZoomButtons() {
  const widgets = document.querySelectorAll('#dashboard > .widget');
  widgets.forEach(w => {
    const header = w.querySelector('.widget-header');
    if (header && !header.querySelector('.widget-carousel-zoom-btn')) {
      const zoomBtn = document.createElement('button');
      zoomBtn.type = 'button';
      zoomBtn.className = 'widget-carousel-zoom-btn';
      zoomBtn.title = 'Vollbild umschalten';
      zoomBtn.innerHTML = '<i class="fas fa-expand"></i>';
      zoomBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleWidgetFullscreen(w);
      });
      header.appendChild(zoomBtn);
    }
  });
}

function initCarouselEngine() {
  if (carouselInitialized) return;
  carouselInitialized = true;

  const dashboard = document.getElementById('dashboard');
  if (!dashboard) return;

  injectZoomButtons();
  initCarouselPills();

  // Navigation Arrows
  const prevBtn = document.getElementById('carouselNavPrev');
  const nextBtn = document.getElementById('carouselNavNext');
  if (prevBtn) prevBtn.addEventListener('click', carouselPrev);
  if (nextBtn) nextBtn.addEventListener('click', carouselNext);

  // Widget Klick- & Tap-Steuerung
  dashboard.addEventListener('click', (e) => {
    const currentMode = localStorage.getItem('dashboard_view_mode') || 'grid';
    if (currentMode !== 'carousel') return;
    if (carouselDidSwipe) return;

    // Wenn Detailansicht aktiv ist und auf den abgedunkelten Hintergrund getippt wird: schließen
    if (isCardFullscreen && !e.target.closest('.widget.fullscreen')) {
      closeWidgetFullscreen();
      return;
    }

    const widget = e.target.closest('.widget');
    if (!widget) return;

    const widgets = getVisibleWidgets();
    const widgetIndex = widgets.indexOf(widget);
    if (widgetIndex === -1) return;

    // 1. Wenn Karte nicht im Fokus: Ins Zentrum holen
    if (widgetIndex !== carouselCurrentIndex) {
      if (!e.target.closest('button, input, select, textarea, canvas, a')) {
        carouselGoTo(widgetIndex);
      }
      return;
    }

    // 2. Wenn Karte bereits aktiv / zentriert ist:
    // A) Klick auf Zoom-Button hat eigenen Handler
    if (e.target.closest('.widget-carousel-zoom-btn')) {
      return;
    }

    // B) Klick auf interaktive Controls im Widget: normal bedienen
    const isInteractive = e.target.closest(
      'button, input, select, textarea, canvas, a, ' +
      '.play-round-btn, .widget-volume-control, .radio-presets-widget, .radio-main-panel, ' +
      '.t-btn, .btn, .gauge-container, .tasmota-row, .waste-item, .camera-view, .station-badge, ' +
      '.sensor-item, .appt-item, .drag-handle, .note-tool-btn, .note-color-btn, .note-size-btn, ' +
      '.timer-preset-btn, .timer-btn, .preset-btn, .note-paper-preview'
    );
    if (isInteractive) {
      return;
    }

    // C) Klick auf Header oder leeren Widget-Hintergrund:
    // Wenn Vollbild-Zoom aktiviert ist, umschalten
    const tapFullscreen = localStorage.getItem('dashboard_carousel_fullscreen') !== 'false';
    if (tapFullscreen || isCardFullscreen) {
      toggleWidgetFullscreen(widget);
    }
  });

  // Touch & Pointer Swipe Gesten
  dashboard.addEventListener('pointerdown', (e) => {
    const currentMode = localStorage.getItem('dashboard_view_mode') || 'grid';
    if (currentMode !== 'carousel' || isCardFullscreen) return;
    if (e.target.closest('#noteCanvas, .note-canvas-wrapper, input[type="range"]')) return;

    carouselSwipeActive = true;
    carouselDidSwipe = false;
    carouselStartX = e.clientX;
    carouselCurrentX = e.clientX;
    carouselStartTime = Date.now();
  });

  window.addEventListener('pointermove', (e) => {
    if (!carouselSwipeActive) return;
    carouselCurrentX = e.clientX;
    if (Math.abs(carouselCurrentX - carouselStartX) > 12) {
      carouselDidSwipe = true;
    }
  });

  window.addEventListener('pointerup', () => {
    if (!carouselSwipeActive) return;
    carouselSwipeActive = false;
    const diffX = carouselCurrentX - carouselStartX;
    const elapsed = Date.now() - carouselStartTime;

    if (diffX < -40 || (diffX < -20 && elapsed < 350)) {
      carouselNext();
    } else if (diffX > 40 || (diffX > 20 && elapsed < 350)) {
      carouselPrev();
    }

    setTimeout(() => {
      carouselDidSwipe = false;
    }, 120);
  });

  window.addEventListener('pointercancel', () => {
    carouselSwipeActive = false;
  });

  // Tastatur-Navigation
  window.addEventListener('keydown', (e) => {
    const currentMode = localStorage.getItem('dashboard_view_mode') || 'grid';
    if (e.key === 'Escape' && isCardFullscreen) {
      closeWidgetFullscreen();
      return;
    }
    if (currentMode !== 'carousel' || isCardFullscreen) return;

    if (e.key === 'ArrowRight') carouselNext();
    if (e.key === 'ArrowLeft') carouselPrev();
  });

  // Reagiere auf Ansichtswechsel
  window.addEventListener('viewmodechange', (e) => {
    const mode = e.detail?.mode;
    if (mode === 'carousel') {
      if (window.dashboardSortable) {
        window.dashboardSortable.option('disabled', true);
      }
      initCarouselPills();
      renderCarousel();
    } else {
      closeWidgetFullscreen();
      if (window.dashboardSortable) {
        window.dashboardSortable.option('disabled', false);
      }
      // Entferne alle Karussell-Klassen
      const widgets = document.querySelectorAll('#dashboard > .widget');
      widgets.forEach(w => {
        w.classList.remove('active', 'prev-1', 'next-1', 'prev-2', 'next-2', 'hidden-left', 'hidden-right', 'no-transition', 'fullscreen');
        w.style.visibility = '';
        w.style.pointerEvents = '';
      });
    }
  });

  // Initiale Ausführung falls bereits Karussell-Modus
  const initialMode = localStorage.getItem('dashboard_view_mode') || 'grid';
  if (initialMode === 'carousel') {
    renderCarousel();
  }
}

// Initialisiere View Mode und Carousel beim Laden
document.addEventListener('DOMContentLoaded', () => {
  initViewMode();
  initCarouselEngine();
});
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  initViewMode();
  initCarouselEngine();
}
