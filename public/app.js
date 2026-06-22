const socket = io();
let hlsCore = null;
let isPlaying = false;
let tasmotaDevices = [];

const localLangMap = {
  de: {
    turnOffRadio: "Radio ausschalten",
    connecting: "Verbinde...",
    atHome: "Zu Hause",
    away: "Unterwegs",
    inbound: "Eingehend",
    outbound: "Ausgehend",
    missed: "Verpasst",
    connected: "Verbunden",
    ringing: "Klingelt...",
    noConnection: "Keine Verb.",
    offline: "offline",
    online: "Online",
    loadingStations: "Senderliste wird geladen...",
    demoLoaded: "Demo geladen",
    stationsFound: "Sender gefunden",
    pingError: "Fehler beim Laden des Feeds für",
    enterIp: "Bitte gib die IP-Adresse deiner Fritz!Box ein.",
    enterPresence: "Bitte gib Name und MAC-Adresse ein.",
    invalidMac: "Ungültiges MAC-Adressen-Format. Bitte verwende z.B. AA:BB:CC:DD:EE:FF",
    deletePersonConfirm: "Möchtest du diese Person wirklich löschen?",
    deletePersonError: "Fehler beim Löschen:",
    deleteCameraConfirm: "Möchtest du diese Kamera wirklich löschen?",
    deleteCameraError: "Fehler beim Löschen der Kamera:",
    enterCamera: "Bitte gib Name und URL für die Kamera ein.",
    tasmotaNewFound: "neue(s) Tasmota-Gerät(e) gefunden und hinzugefügt!",
    tasmotaAlreadyReg: "Gerät(e) im Netzwerk gefunden, aber alle sind bereits in deiner Liste registriert.",
    tasmotaNone: "Keine Tasmota-Geräte im Netzwerk gefunden. Bitte stelle sicher, dass sie eingeschaltet und im selben WLAN sind.",
    tasmotaScanErr: "Fehler beim Scannen des Netzwerks.",
    weatherLimit: "Limit erreicht",
    taupunkt: "Taupunkt"
  },
  en: {
    turnOffRadio: "Turn off Radio",
    connecting: "Connecting...",
    atHome: "At Home",
    away: "Away",
    inbound: "Inbound",
    outbound: "Outbound",
    missed: "Missed",
    connected: "Connected",
    ringing: "Ringing...",
    noConnection: "No connection",
    offline: "offline",
    online: "Online",
    loadingStations: "Loading station list...",
    demoLoaded: "Demo loaded",
    stationsFound: "stations found",
    pingError: "Error loading feed for",
    enterIp: "Please enter your Fritz!Box IP address.",
    enterPresence: "Please enter a name and MAC address.",
    invalidMac: "Invalid MAC address format. Please use e.g. AA:BB:CC:DD:EE:FF",
    deletePersonConfirm: "Do you really want to delete this person?",
    deletePersonError: "Delete error:",
    deleteCameraConfirm: "Do you really want to delete this camera?",
    deleteCameraError: "Error deleting camera:",
    enterCamera: "Please enter a name and URL for the camera.",
    tasmotaNewFound: "new Tasmota device(s) found and added!",
    tasmotaAlreadyReg: "device(s) found in network, but all are already registered in your list.",
    tasmotaNone: "No Tasmota devices found in the network. Please make sure they are powered on and on the same Wi-Fi.",
    tasmotaScanErr: "Error scanning network.",
    weatherLimit: "Limit reached",
    taupunkt: "Dew point"
  },
  fr: {
    turnOffRadio: "Éteindre la radio",
    connecting: "Connexion...",
    atHome: "À la maison",
    away: "Dehors",
    inbound: "Entrant",
    outbound: "Sortant",
    missed: "Manqué",
    connected: "Connecté",
    ringing: "Sonnerie...",
    noConnection: "Pas de conn.",
    offline: "hors ligne",
    online: "En ligne",
    loadingStations: "Chargement de la liste...",
    demoLoaded: "Démo chargée",
    stationsFound: "stations trouvées",
    pingError: "Erreur de chargement du flux pour",
    enterIp: "Veuillez saisir l'adresse IP de votre Fritz!Box.",
    enterPresence: "Veuillez saisir un nom et une adresse MAC.",
    invalidMac: "Format d'adresse MAC invalide. Veuillez utiliser par ex. AA:BB:CC:DD:EE:FF",
    deletePersonConfirm: "Voulez-vous vraiment supprimer cette personne?",
    deletePersonError: "Erreur de suppression:",
    deleteCameraConfirm: "Voulez-vous vraiment supprimer cette caméra?",
    deleteCameraError: "Erreur lors de la suppression de la caméra:",
    enterCamera: "Veuillez saisir un nom et une URL pour la caméra.",
    tasmotaNewFound: "nouveau(x) périphérique(s) Tasmota trouvé(s) et ajouté(s)!",
    tasmotaAlreadyReg: "périphérique(s) trouvé(s), mais tous sont déjà enregistrés.",
    tasmotaNone: "Aucun périphérique Tasmota trouvé. Veuillez vérifier qu'ils sont allumés et sur le même Wi-Fi.",
    tasmotaScanErr: "Erreur lors du scan du réseau.",
    weatherLimit: "Limite atteinte",
    taupunkt: "Point de rosée"
  },
  es: {
    turnOffRadio: "Apagar la radio",
    connecting: "Conectando...",
    atHome: "En casa",
    away: "Fuera",
    inbound: "Entrante",
    outbound: "Saliente",
    missed: "Perdida",
    connected: "Conectado",
    ringing: "Llamando...",
    noConnection: "Sin conex.",
    offline: "desconectado",
    online: "En línea",
    loadingStations: "Cargando lista de emisoras...",
    demoLoaded: "Demo cargada",
    stationsFound: "emisoras encontradas",
    pingError: "Error al cargar el feed de",
    enterIp: "Por favor ingrese la dirección IP de su Fritz!Box.",
    enterPresence: "Por favor ingrese un nombre y dirección MAC.",
    invalidMac: "Formato de dirección MAC no válido. Por favor use p.ej. AA:BB:CC:DD:EE:FF",
    deletePersonConfirm: "¿Realmente quieres eliminar a esta persona?",
    deletePersonError: "Error al eliminar:",
    deleteCameraConfirm: "¿Realmente quieres eliminar esta cámara?",
    deleteCameraError: "Error al eliminar la cámara:",
    enterCamera: "Por favor ingrese un nombre y URL para la cámara.",
    tasmotaNewFound: "¡nuevo(s) dispositivo(s) Tasmota encontrado(s) y agregado(s)!",
    tasmotaAlreadyReg: "dispositivo(s) encontrado(s) en la red, pero todos ya están registrados.",
    tasmotaNone: "No se encontraron dispositivos Tasmota en la red. Asegúrese de que estén encendidos y en el mismo Wi-Fi.",
    tasmotaScanErr: "Error al escanear la red.",
    weatherLimit: "Límite alcanzado",
    taupunkt: "Punto de rocío"
  },
  it: {
    turnOffRadio: "Spegni la radio",
    connecting: "Connessione...",
    atHome: "A casa",
    away: "Fuori",
    inbound: "In entrata",
    outbound: "In uscita",
    missed: "Persa",
    connected: "Connesso",
    ringing: "Squilla...",
    noConnection: "Senza conn.",
    offline: "non in linea",
    online: "In linea",
    loadingStations: "Caricamento lista stazioni...",
    demoLoaded: "Demo caricata",
    stationsFound: "stazioni trovate",
    pingError: "Errore durante il caricamento del feed per",
    enterIp: "Inserisci l'indirizzo IP del tuo Fritz!Box.",
    enterPresence: "Inserisci un nome e un indirizzo MAC.",
    invalidMac: "Formato dell'indirizzo MAC non valido. Utilizzare ad es. AA:BB:CC:DD:EE:FF",
    deletePersonConfirm: "Vuoi davvero cancellare questa persona?",
    deletePersonError: "Errore durante la cancellazione:",
    deleteCameraConfirm: "Vuoi davvero eliminare questa telecamera?",
    deleteCameraError: "Errore durante l'eliminazione della telecamera:",
    enterCamera: "Inserisci un nome e un URL per la telecamera.",
    tasmotaNewFound: "nuovo/i dispositivo/i Tasmota trovato/i e aggiunto/i!",
    tasmotaAlreadyReg: "dispositivo/i trovato/i nella rete, ma tutti sono già registrati.",
    tasmotaNone: "Nessun dispositivo Tasmota trovato nella rete. Assicurarsi che siano accesi e sulla stessa rete Wi-Fi.",
    tasmotaScanErr: "Errore durante la scansione della rete.",
    weatherLimit: "Limite raggiunto",
    taupunkt: "Punto di rugiada"
  },
  nl: {
    turnOffRadio: "Radio uitschakelen",
    connecting: "Verbinden...",
    atHome: "Thuis",
    away: "Onderweg",
    inbound: "Inkomend",
    outbound: "Uitgaand",
    missed: "Gemist",
    connected: "Verbonden",
    ringing: "Overgaan...",
    noConnection: "Geen verb.",
    offline: "offline",
    online: "Online",
    loadingStations: "Zenderlijst laden...",
    demoLoaded: "Demo geladen",
    stationsFound: "zenders gevonden",
    pingError: "Fout bij laden van feed voor",
    enterIp: "Voer het IP-adres van uw Fritz!Box in.",
    enterPresence: "Voer een naam en MAC-adres in.",
    invalidMac: "Ongeldig MAC-adres formaat. Gebruik bijv. AA:BB:CC:DD:EE:FF",
    deletePersonConfirm: "Weet u zeker dat u deze persoon wilt verwijderen?",
    deletePersonError: "Fout bij verwijderen:",
    deleteCameraConfirm: "Weet u zeker dat u deze camera wilt verwijderen?",
    deleteCameraError: "Fout bij verwijderen van camera:",
    enterCamera: "Voer een naam en URL in voor de camera.",
    tasmotaNewFound: "nieuw(e) Tasmota appara(a)t(en) gevonden en toegevoegd!",
    tasmotaAlreadyReg: "appara(a)t(en) gevonden in netwerk, maar allemaal al geregistreerd.",
    tasmotaNone: "Geen Tasmota apparaten gevonden in het netwerk. Zorg ervoor dat ze aan staan en op dezelfde Wi-Fi zitten.",
    tasmotaScanErr: "Fout bij scannen van netwerk.",
    weatherLimit: "Limiet bereikt",
    taupunkt: "Dauwpunt"
  },
  pl: {
    turnOffRadio: "Wyłącz radio",
    connecting: "Łączenie...",
    atHome: "W domu",
    away: "Poza domem",
    inbound: "Przychodzące",
    outbound: "Wychodzące",
    missed: "Nieodebrane",
    connected: "Połączone",
    ringing: "Dzwoni...",
    noConnection: "Brak poł.",
    offline: "offline",
    online: "Online",
    loadingStations: "Ładowanie listy stacji...",
    demoLoaded: "Załadowano demo",
    stationsFound: "znalezionych stacji",
    pingError: "Błąd ładowania strumienia dla",
    enterIp: "Wprowadź adres IP Fritz!Box.",
    enterPresence: "Wprowadź imię i adres MAC.",
    invalidMac: "Nieprawidłowy format adresu MAC. Użyj np. AA:BB:CC:DD:EE:FF",
    deletePersonConfirm: "Czy na pewno chcesz usunąć tę osobę?",
    deletePersonError: "Błąd usuwania:",
    deleteCameraConfirm: "Czy na pewno chcesz usunąć tę kamerę?",
    deleteCameraError: "Błąd usuwania kamery:",
    enterCamera: "Wprowadź nazwę i URL kamery.",
    tasmotaNewFound: "znaleziono i dodano nowe urządzenia Tasmota!",
    tasmotaAlreadyReg: "znaleziono urządzenia w sieci, ale wszystkie są już zarejestrowane.",
    tasmotaNone: "Nie znaleziono urządzeń Tasmota w sieci. Upewnij się, że są włączone i w tej samej sieci Wi-Fi.",
    tasmotaScanErr: "Błąd skanowania sieci.",
    weatherLimit: "Osiągnięto limit",
    taupunkt: "Punkt rosy"
  }
};

function getLangText(key) {
  const lang = localStorage.getItem('dashboard_lang') || 'de';
  if (localLangMap[lang] && localLangMap[lang][key] !== undefined) {
    return localLangMap[lang][key];
  }
  return localLangMap['de'][key] || key;
}

function applyTheme(themeClass) {
  document.body.classList.remove('theme-aurora', 'theme-cyberpunk', 'theme-nordic', 'theme-retrowave', 'theme-terminal', 'theme-stealth');
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
  initJarvis();
  initCalendar();
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

  // Sprache laden und anwenden
  let savedLang = localStorage.getItem('dashboard_lang');
  if (!savedLang) {
    const browserLang = navigator.language ? navigator.language.split('-')[0] : 'de';
    savedLang = (translations && translations[browserLang]) ? browserLang : 'de';
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

function updateDateTime() {
  const now = new Date();
  const lang = localStorage.getItem('dashboard_lang') || 'de';
  const localeMap = {
    de: 'de-DE',
    en: 'en-US',
    fr: 'fr-FR',
    es: 'es-ES',
    it: 'it-IT',
    nl: 'nl-NL',
    pl: 'pl-PL'
  };
  const locale = localeMap[lang] || 'de-DE';
  const timeStr = now.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' });
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

async function loadWeather() {
  let locName = localStorage.getItem('weatherLoc') || 'Berlin';
  const provider = localStorage.getItem('weather_provider') || 'openmeteo';
  const apiKey = localStorage.getItem('weather_api_key') || '';

  let lat = parseFloat(localStorage.getItem('weather_lat'));
  let lon = parseFloat(localStorage.getItem('weather_lon'));
  let cachedLoc = localStorage.getItem('weather_loc_resolved');

  const lang = localStorage.getItem('dashboard_lang') || 'de';
  // 1. Geocoding nur machen, wenn die Stadt geaendert wurde oder noch keine Koordinaten da sind (fuer Open-Meteo)
  if (provider === 'openmeteo' && (!lat || !lon || cachedLoc !== locName)) {
    try {
      const geoRes = await (await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(locName)}&count=1&language=${lang}&format=json`)).json();
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
      const weatherUrl = `https://api.weatherapi.com/v1/forecast.json?key=${apiKey}&q=${encodeURIComponent(query)}&days=1&aqi=no&alerts=no&lang=${lang}`;
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
      document.getElementById('weatherCondition').textContent = getLangText('weatherLimit');
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
        cond = { text: (translations[lang] ? translations[lang].weather_sunny || 'Sonnig' : 'Sonnig'), icon: 'fa-sun', style: 'sunny' };
      } else if (code === 1003) {
        cond = { text: (translations[lang] ? translations[lang].weather_partly_cloudy || 'Leicht bewölkt' : 'Leicht bewölkt'), icon: 'fa-cloud-sun', style: 'cloudy' };
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
      const conditionsMap = {
        de: {
          0: 'Klar', 1: 'Überwiegend klar', 2: 'Leicht bewölkt', 3: 'Bewölkt', 45: 'Nebel', 48: 'Reifnebel',
          51: 'Nieselregen', 53: 'Nieselregen', 55: 'Starker Nieselregen', 61: 'Regen', 63: 'Regen',
          65: 'Starker Regen', 71: 'Schnee', 80: 'Regenschauer', 95: 'Gewitter'
        },
        en: {
          0: 'Clear', 1: 'Mostly clear', 2: 'Partly cloudy', 3: 'Cloudy', 45: 'Fog', 48: 'Depositing rime fog',
          51: 'Drizzle', 53: 'Drizzle', 55: 'Heavy drizzle', 61: 'Rain', 63: 'Rain',
          65: 'Heavy rain', 71: 'Snow', 80: 'Rain showers', 95: 'Thunderstorm'
        },
        fr: {
          0: 'Clair', 1: 'Principalement clair', 2: 'Partiellement nuageux', 3: 'Nuageux', 45: 'Brouillard', 48: 'Brouillard givrant',
          51: 'Bruine', 53: 'Bruine', 55: 'Bruine forte', 61: 'Pluie', 63: 'Pluie',
          65: 'Pluie forte', 71: 'Neige', 80: 'Averses de pluie', 95: 'Orage'
        },
        es: {
          0: 'Despejado', 1: 'Mayormente despejado', 2: 'Parcialmente nublado', 3: 'Nublado', 45: 'Niebla', 48: 'Niebla helada',
          51: 'Llovizna', 53: 'Llovizna', 55: 'Llovizna fuerte', 61: 'Lluvia', 63: 'Lluvia',
          65: 'Lluvia fuerte', 71: 'Nieve', 80: 'Chubascos de lluvia', 95: 'Tormenta'
        },
        it: {
          0: 'Sereno', 1: 'Prevalentemente sereno', 2: 'Parzialmente nuvoloso', 3: 'Nuvoloso', 45: 'Nebbia', 48: 'Nebbia con brina',
          51: 'Pioggerellina', 53: 'Pioggerellina', 55: 'Pioggerellina intensa', 61: 'Pioggia', 63: 'Pioggia',
          65: 'Pioggia forte', 71: 'Neve', 80: 'Rovesci di pioggia', 95: 'Temporale'
        },
        nl: {
          0: 'Helder', 1: 'Overwegend helder', 2: 'Licht bewolkt', 3: 'Bewolkt', 45: 'Mist', 48: 'Rijpmist',
          51: 'Motregen', 53: 'Motregen', 55: 'Zware motregen', 61: 'Regen', 63: 'Regen',
          65: 'Zware regen', 71: 'Sneeuw', 80: 'Regenbuien', 95: 'Onweer'
        },
        pl: {
          0: 'Jasno', 1: 'Przeważnie jasno', 2: 'Lekkie zachmurzenie', 3: 'Zachmurzenie', 45: 'Mgła', 48: 'Mgła osadzająca szadź',
          51: 'Mżawka', 53: 'Mżawka', 55: 'Silna mżawka', 61: 'Deszcz', 63: 'Deszcz',
          65: 'Silny deszcz', 71: 'Śnieg', 80: 'Opady deszczu', 95: 'Burza'
        }
      };
      const langConds = conditionsMap[lang] || conditionsMap['de'];
      
      const conditions = {
        0:{text:langConds[0],icon:'fa-sun',style:'sunny'},
        1:{text:langConds[1],icon:'fa-sun',style:'sunny'},
        2:{text:langConds[2],icon:'fa-cloud-sun',style:'cloudy'},
        3:{text:langConds[3],icon:'fa-cloud',style:'cloudy'},
        45:{text:langConds[45],icon:'fa-smog',style:'cloudy'},
        48:{text:langConds[48],icon:'fa-smog',style:'cloudy'},
        51:{text:langConds[51],icon:'fa-cloud-rain',style:'rainy'},
        53:{text:langConds[53],icon:'fa-cloud-rain',style:'rainy'},
        55:{text:langConds[55],icon:'fa-cloud-rain',style:'rainy'},
        61:{text:langConds[61],icon:'fa-cloud-rain',style:'rainy'},
        63:{text:langConds[63],icon:'fa-cloud-showers-heavy',style:'rainy'},
        65:{text:langConds[65],icon:'fa-cloud-showers-heavy',style:'rainy'},
        71:{text:langConds[71],icon:'fa-snowflake',style:'cloudy'},
        80:{text:langConds[80],icon:'fa-cloud-sun-rain',style:'rainy'},
        95:{text:langConds[95],icon:'fa-cloud-bolt',style:'rainy'}
      };
      cond = conditions[d.current.weather_code] || { text: (translations[lang] ? translations[lang].weather_clouds || 'Bedeckt' : 'Bedeckt'), icon: 'fa-cloud', style: 'cloudy' };
    }
    
    document.getElementById('weatherCondition').textContent = cond.text;
    document.querySelector('.weather-icon').innerHTML = `<i class="fas ${cond.icon}"></i>`;
    document.querySelector('.weather-icon').className = `weather-icon ${cond.style}`;
  } catch(e) {
    console.error("Renderfehler beim Wetter:", e);
  }
}

async function loadICS() {
  const lang = localStorage.getItem('dashboard_lang') || 'de';
  const localeMap = {
    de: 'de-DE',
    en: 'en-US',
    fr: 'fr-FR',
    es: 'es-ES',
    it: 'it-IT',
    nl: 'nl-NL',
    pl: 'pl-PL'
  };
  const locale = localeMap[lang] || 'de-DE';
  const todayText = translations[lang] ? translations[lang].today_waste_alert.replace(':', '') : 'Heute';
  const tomorrowText = translations[lang] ? translations[lang].tomorrow_waste_alert.replace(':', '') : 'Morgen';

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

      // Deduplicate: merge events that share the same waste-type keyword AND
      // the same calendar day into a single entry so e.g. Schadstoffmobil
      // (which has multiple location/time entries per day) shows only once.
      const deduped = [];
      const seen = new Set();
      events.forEach(e => {
        // Derive a stable type key from the summary
        const s = (e.summary || '').toLowerCase();
        let typeKey;
        if (s.includes('bio')) typeKey = 'bio';
        else if (s.includes('papier')) typeKey = 'paper';
        else if (s.includes('gelb') || s.includes('plastik')) typeKey = 'plastic';
        else if (s.includes('schadstoff')) typeKey = 'schadstoff';
        else if (s.includes('restm')) typeKey = 'residual';
        else typeKey = s.replace(/\s+/g, '_').substring(0, 30);
        const key = typeKey + '_' + e.date;
        if (!seen.has(key)) {
          seen.add(key);
          deduped.push(e);
        }
      });

      const list = document.getElementById('wasteBody');
      if(!list) return;
      
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayStr = today.getFullYear() + String(today.getMonth()+1).padStart(2,'0') + String(today.getDate()).padStart(2,'0');
      const upcoming = deduped.filter(e => e.date >= todayStr).slice(0, 4);
      
      if(upcoming.length === 0) { 
        list.innerHTML = (translations[lang] && translations[lang].waste_no_dates) ? `<p style="color:rgba(255,255,255,0.5);">${translations[lang].waste_no_dates}</p>` : '<p style="color:rgba(255,255,255,0.5);">Keine Termine.</p>'; 
        const alertContainer = document.getElementById('headerWasteAlert');
        if (alertContainer) { alertContainer.style.display = 'none'; alertContainer.innerHTML = ''; }
        return; 
      }
      
      let html = '<div class="waste-list">';
      const alerts = [];
      
      upcoming.forEach(e => {
        const dt = new Date(e.date.substring(0,4), e.date.substring(4,6)-1, e.date.substring(6,8));
        let type = 'residual'; const s = e.summary.toLowerCase();
        if(s.includes('bio')) type = 'bio'; else if(s.includes('papier')) type = 'paper'; else if(s.includes('gelb')||s.includes('plastik')) type = 'plastic'; else if(s.includes('schadstoff')) type = 'hazardous';
        let dateStr = dt.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' });
        // Compare calendar days, not the current clock time. Otherwise tomorrow
        // before the current time-of-day was shown as "Heute".
        const diff = Math.round((dt - today) / (1000 * 60 * 60 * 24));
        if(diff === 0) dateStr = todayText; else if(diff === 1) dateStr = tomorrowText;

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
            dateStr: diff === 0 ? todayText : tomorrowText
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
            else if (alert.type === 'hazardous') icon = 'fa-skull-crossbones';
            
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
    const lang = localStorage.getItem('dashboard_lang') || 'de';
    statusLabel.textContent = playing ? (translations[lang] ? translations[lang].radio_status_live || 'LIVE' : 'LIVE') : (translations[lang] ? translations[lang].radio_status_choose || 'Sender wählen' : 'Sender wählen');
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

  // Intercept HTTP stream URL when running on secure HTTPS page
  let playUrl = url;
  if (window.location.protocol === 'https:' && url.startsWith('http://')) {
    playUrl = '/api/proxy-stream?url=' + encodeURIComponent(url);
    console.log('[Radio] Secured HTTP audio stream via proxy:', playUrl);
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
        hlsCore.loadSource(playUrl); 
        hlsCore.attachMedia(activeAudioElement); 
        hlsCore.startLoad();
    }
    else if(activeAudioElement.canPlayType('application/vnd.apple.mpegurl')) {
        activeAudioElement.src=playUrl;
    }
  } else {
      activeAudioElement.src = playUrl;
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
        '<span class="station-name" style="color: #ef4444; font-weight: 600;">' + getLangText('turnOffRadio') + '</span>' +
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
      dewEl.textContent = Number.isFinite(dew) ? `${getLangText('taupunkt')} ${dew.toFixed(1)}°` : `${getLangText('taupunkt')} --°`;
    }
    if(status) status.textContent = data.time ? data.time.slice(11, 16) : ip;
  } catch(e) {
    tempEl.textContent = '--°';
    setGauge('tempGauge', 0, -10, 40);
    if(humidityEl) {
      humidityEl.textContent = '--%';
      setGauge('humidityGauge', 0, 0, 100);
    }
    if(dewEl) dewEl.textContent = `${getLangText('taupunkt')} --°`;
    if(status) status.textContent = getLangText('offline');
  }
}

function initSensorWidget() {
  refreshSensorWidget();
  setInterval(refreshSensorWidget, 15000);
}

function initSystemBargraph() {
  function formatBitrate(bytesPerSec) {
    if (!bytesPerSec || bytesPerSec < 0) return '0.0 Mbit/s';
    const bitsPerSec = bytesPerSec * 8;
    if (bitsPerSec < 1000000) {
      return (bitsPerSec / 1000).toFixed(0) + ' Kbit/s';
    }
    return (bitsPerSec / 1000000).toFixed(1) + ' Mbit/s';
  }

  function updateBar(id, val, max, unit, dec=0) {
    const el = document.getElementById('val-'+id); if(!el) return;
    el.textContent = (dec?val.toFixed(dec):Math.round(val)) + ' ' + unit;
    
    const circle = document.getElementById('circle-'+id); if(!circle) return;
    const pct = Math.max(0, Math.min(val/max, 1));
    const circumference = 251.327; // 2 * Math.PI * 40
    const offset = circumference * (1 - pct);
    circle.style.strokeDashoffset = offset;
  }

  socket.on('sys-status', d => {
    updateBar('cpu', d.cpu, 100, '%');
    updateBar('ram', d.ram, 100, '%');
    updateBar('temp', d.temp, 90, '°C');
    updateBar('net', d.net, 15, 'MB/s', 2);

    const elDown = document.getElementById('valFritzDown');
    if (elDown && d.netDown !== undefined) {
      elDown.textContent = formatBitrate(d.netDown);
    }
    const elUp = document.getElementById('valFritzUp');
    if (elUp && d.netUp !== undefined) {
      elUp.textContent = formatBitrate(d.netUp);
    }
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
          let newCount = 0;
          data.found.forEach(f => {
            if(!tasmotaDevices.find(d => d.ip === f.ip)) {
              tasmotaDevices.push(f);
              newCount++;
            }
          });
          await saveTasmotaList();
          
          if (newCount > 0) {
            alert(`${newCount} ` + getLangText('tasmotaNewFound'));
          } else {
            alert(getLangText('tasmotaAlreadyReg'));
          }
        } else {
          alert(getLangText('tasmotaNone'));
        }
      } catch(e) {
        console.error("Tasmota Scan Error", e);
        alert(getLangText('tasmotaScanErr'));
      }
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
  const lang = localStorage.getItem('dashboard_lang') || 'de';
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
        alert(getLangText('enterIp'));
        return;
      }

      saveBtn.disabled = true;
      const oldText = saveBtn.innerHTML;
      saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ' + getLangText('connecting');

      try {
        const response = await fetch('/api/fritzbox/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ip, user, pass, callMonitorEnabled })
        });
        const data = await response.json();
        if(data && data.success) {
          alert(translations[lang] && translations[lang].fritzbox_connect ? translations[lang].fritzbox_connect : 'Fritz!Box Connected!');
          if(document.getElementById('fritzPassword')) document.getElementById('fritzPassword').value = ''; // clear password field
        } else {
          alert('Error: ' + (data.error || 'Unknown Error'));
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
        valFritzStatus.textContent = `${getLangText('online')} (${status.fritzLatency}ms)`;
      } else {
        ledFritz.className = 'led-dot red';
        valFritzStatus.textContent = getLangText('offline');
      }
    }

    const settingsLedFritz = document.getElementById('settingsLedFritz');
    if(settingsLedFritz) {
      settingsLedFritz.className = status.fritzOnline ? 'led-dot green' : 'led-dot red';
    }

    if(ledInternet && valInternetStatus) {
      if(status.internetOnline) {
        ledInternet.className = 'led-dot green';
        valInternetStatus.textContent = `${getLangText('online')} (${status.internetLatency}ms)`;
      } else {
        ledInternet.className = 'led-dot red';
        valInternetStatus.textContent = getLangText('offline');
      }
    }
  });

  // 2. Call log updates
  socket.on('fritz-calls', (calls) => {
    const list = document.getElementById('fritzCallList');
    if(!list) return;

    if(!calls || calls.length === 0) {
      list.innerHTML = `<div class="no-calls" data-i18n="fritzbox_no_calls">${translations[lang] ? translations[lang].fritzbox_no_calls : 'Keine Anrufe protokolliert.'}</div>`;
      return;
    }

    list.innerHTML = '';
    calls.forEach(call => {
      const item = document.createElement('div');
      item.className = 'fritz-call-item';
      
      let iconClass = 'fa-phone';
      let iconStyleClass = 'inbound';
      let typeLabel = getLangText('inbound');

      if(call.type === 'RING') {
        iconClass = 'fa-phone-volume';
        iconStyleClass = 'inbound';
        typeLabel = getLangText('inbound');
      } else if(call.type === 'CALL') {
        iconClass = 'fa-phone-flip';
        iconStyleClass = 'outbound';
        typeLabel = getLangText('outbound');
      } else if(call.type === 'MISSED') {
        iconClass = 'fa-phone-slash';
        iconStyleClass = 'missed';
        typeLabel = getLangText('missed');
      } else if(call.type === 'CONNECTED') {
        iconClass = 'fa-phone-square';
        iconStyleClass = 'connected';
        typeLabel = getLangText('connected');
      }

      // Format Duration
      let durText = '';
      if(call.duration > 0) {
        const m = Math.floor(call.duration / 60);
        const s = call.duration % 60;
        durText = m > 0 ? `${m}m ${s}s` : `${s}s`;
      } else if(call.type === 'MISSED') {
        durText = getLangText('missed');
      } else if(call.type === 'RING') {
        durText = getLangText('ringing');
      } else {
        durText = getLangText('noConnection');
      }

      const uhrText = lang === 'de' ? ' Uhr' : '';
      item.innerHTML = `
        <div class="call-info-left">
          <div class="call-icon ${iconStyleClass}"><i class="fas ${iconClass}"></i></div>
          <div class="call-details">
            <span class="call-name">${call.callerName || call.number}</span>
            <span class="call-time">${call.time}${uhrText} · ${typeLabel}</span>
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
      if(toastCaller) toastCaller.textContent = event.callerName || (translations[lang] ? translations[lang].toast_unknown_caller : 'Unbekannter Anrufer');
      overlay.removeAttribute('hidden');
    } else {
      overlay.setAttribute('hidden', '');
    }
  });
}

async function initPresence() {
  const lang = localStorage.getItem('dashboard_lang') || 'de';
  const addBtn = document.getElementById('addPresenceBtn');
  const fileInput = document.getElementById('presenceManAvatar');
  const fileNameSpan = document.getElementById('presenceManAvatarName');
  
  let uploadedAvatarUrl = '';

  // 1. Profilbild Upload Handler
  if(fileInput && fileNameSpan) {
    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if(!file) {
        fileNameSpan.textContent = translations[lang] ? translations[lang].presence_no_avatar : 'Kein Bild gewählt';
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
        alert(getLangText('enterPresence'));
        return;
      }

      if(!/^([0-9A-F]{2}[:-]){5}([0-9A-F]{2})$/i.test(mac)) {
        alert(getLangText('invalidMac'));
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
          if (fileInput) fileInput.value = '';
          if (fileNameSpan) {
            fileNameSpan.textContent = (typeof translations !== 'undefined' && translations[lang]) ? translations[lang].presence_no_avatar : 'Kein Bild gewählt';
          }
          uploadedAvatarUrl = '';
        } else {
          alert('Fehler beim Hinzufügen: ' + (data.error || 'Unbekannter Fehler'));
        }
      } catch(err) {
        console.error('Fehler beim Hinzufügen der Person:', err);
        alert('Fehler beim Hinzufügen der Person: ' + err.message);
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
      list.innerHTML = `<div style="font-size: 11px; color: var(--text-muted); text-align: center; padding: 10px;">${translations[lang] ? translations[lang].presence_no_people : 'Keine Personen registriert.'}</div>`;
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
    if(!confirm(getLangText('deletePersonConfirm'))) return;
    try {
      const res = await fetch('/api/presence/' + id, { method: 'DELETE' });
      const data = await res.json();
      if(!data.success) {
        alert(getLangText('deletePersonError') + ' ' + (data.error || 'Error'));
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
      grid.innerHTML = `<div class="no-presence-devices">${translations[lang] ? translations[lang].presence_no_people : 'Keine Personen registriert.'}</div>`;
      return;
    }

    persons.forEach(p => {
      const card = document.createElement('div');
      card.className = `presence-avatar-card ${p.active ? 'active' : 'inactive'}`;
      card.id = `usr-${p.id}`;
      card.style.cssText = 'display: flex; flex-direction: column; align-items: center; gap: 8px; transition: var(--transition);';
      
      const badgeStyle = p.active ? 'background-color: var(--green);' : 'background-color: var(--text-muted);';
      const statusText = p.active ? getLangText('atHome') : getLangText('away');
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
          status.textContent = getLangText('atHome');
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
          status.textContent = getLangText('away');
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
      alert(getLangText('enterCamera'));
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
      console.error('Fehler beim Hinzufügen der Kamera:', err);
      alert('Fehler beim Hinzufügen der Kamera: ' + err.message);
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
    const lang = localStorage.getItem('dashboard_lang') || 'de';
    list.innerHTML = `<div style="font-size: 11px; color: var(--text-muted); text-align: center; padding: 10px;">${translations[lang] ? translations[lang].camera_no_cameras : 'Keine Kameras registriert.'}</div>`;
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
  if(!confirm(getLangText('deleteCameraConfirm'))) return;
  try {
    const res = await fetch('/api/cameras/' + id, { method: 'DELETE' });
    const data = await res.json();
    if(!data.success) {
      alert(getLangText('deleteCameraError') + ' ' + (data.error || 'Error'));
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
    const lang = localStorage.getItem('dashboard_lang') || 'de';
    grid.innerHTML = `<div class="no-cameras">${translations[lang] ? translations[lang].camera_no_cameras : 'Keine Kameras eingerichtet.'}</div>`;
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

// ==========================================
// J.A.R.V.I.S. WIDGET LOGIC & API ANBINDUNG
// ==========================================

let jarvisHistory = [];
let jarvisRecognition = null;
let jarvisSpeakingUtterance = null;
let elevenLabsAudio = null;
let currentTtsRequestId = 0;

function playJarvisBeep(freq, duration, volume = 0.15) {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {
    console.warn("AudioContext blockiert oder nicht unterstützt", e);
  }
}

function cancelJarvisSpeech() {
  currentTtsRequestId++; // Invalidate any ongoing fetch request
  if ('speechSynthesis' in window) {
    try { window.speechSynthesis.cancel(); } catch(e) {}
  }
  if (elevenLabsAudio) {
    try {
      elevenLabsAudio.pause();
      elevenLabsAudio.currentTime = 0;
    } catch(e) {}
    elevenLabsAudio = null;
  }
  const reactor = document.getElementById('jarvisReactor');
  if (reactor) reactor.classList.remove('speaking');
  const statusSpan = document.getElementById('jarvisStatus');
  if (statusSpan && (statusSpan.textContent === 'Antwortet...' || statusSpan.textContent === 'Hör zu...')) {
    statusSpan.textContent = 'Online';
  }
}

function speakLocalSpeech(text) {
  if (!('speechSynthesis' in window)) return;
  
  const lang = localStorage.getItem('dashboard_lang') || 'de';
  jarvisSpeakingUtterance = new SpeechSynthesisUtterance(text);
  
  // Status-Event-Listener für Sprachausgabe
  jarvisSpeakingUtterance.onstart = () => {
    const statusSpan = document.getElementById('jarvisStatus');
    if (statusSpan) statusSpan.textContent = 'Antwortet...';
    const reactor = document.getElementById('jarvisReactor');
    if (reactor) reactor.classList.add('speaking');
  };
  
  const resetSpeechUI = () => {
    const statusSpan = document.getElementById('jarvisStatus');
    if (statusSpan && statusSpan.textContent === 'Antwortet...') {
      statusSpan.textContent = 'Online';
    }
    const reactor = document.getElementById('jarvisReactor');
    if (reactor) reactor.classList.remove('speaking');
  };
  
  jarvisSpeakingUtterance.onend = resetSpeechUI;
  jarvisSpeakingUtterance.onerror = resetSpeechUI;
  
  // Sprachcode setzen
  // Versuchen eine passende Stimme zu wählen
  const voices = window.speechSynthesis.getVoices();
  if (voices && voices.length > 0) {
    // Check if user picked a specific browser voice from the unified dropdown
    const savedLocalVoiceName = localStorage.getItem('jarvis_local_voice_name') || '';
    if (savedLocalVoiceName) {
      const exact = voices.find(v => v.name === savedLocalVoiceName);
      if (exact) {
        jarvisSpeakingUtterance.voice = exact;
      }
    } else {
      // Auto-detect: prefer male voices matching the UI language
      const langVoices = voices.filter(v => v.lang.startsWith(lang));
      if (langVoices.length > 0) {
        const maleNames = ['stefan', 'Conrad', 'yannick', 'markus', 'christoph', 'Klaus', 'male', 'guy', 'männlich'];
        let maleVoice = langVoices.find(v => {
          const nameLower = v.name.toLowerCase();
          return (nameLower.includes('natural') || nameLower.includes('online')) &&
                 maleNames.some(n => nameLower.includes(n));
        });
        if (!maleVoice) {
          maleVoice = langVoices.find(v => {
            const nameLower = v.name.toLowerCase();
            return maleNames.some(n => nameLower.includes(n));
          });
        }
        if (!maleVoice) {
          maleVoice = langVoices.find(v => {
            const nameLower = v.name.toLowerCase();
            return nameLower.includes('natural') || nameLower.includes('online');
          });
        }
        jarvisSpeakingUtterance.voice = maleVoice || langVoices[0];
      }
    }
  }

  const langMap = { de: 'de-DE', en: 'en-US', fr: 'fr-FR', es: 'es-ES', it: 'it-IT', nl: 'nl-NL', pl: 'pl-PL' };
  jarvisSpeakingUtterance.lang = langMap[lang] || 'de-DE';
  jarvisSpeakingUtterance.rate = 1.05;
  jarvisSpeakingUtterance.pitch = 0.95;

  window.speechSynthesis.speak(jarvisSpeakingUtterance);
}

function speakJarvisReply(text) {
  cancelJarvisSpeech();
  
  const enabled = localStorage.getItem('jarvis_tts_enabled') !== 'false';
  if (!enabled) return;
  
  const provider = localStorage.getItem('jarvis_tts_provider') || 'local';
  
  if (provider === 'elevenlabs') {
    const apiKey = localStorage.getItem('jarvis_eleven_api_key') || '';
    const voiceId = localStorage.getItem('jarvis_eleven_voice_id') || '21m00Tcm4TlvDq8ikWAM';
    
    if (!apiKey) {
      console.warn("ElevenLabs API Key fehlt, nutze lokale Sprachausgabe.");
      speakLocalSpeech(text);
      return;
    }
    
    const requestId = ++currentTtsRequestId;
    
    // Status-Event-Listener für Sprachausgabe setzen
    const statusSpan = document.getElementById('jarvisStatus');
    if (statusSpan) statusSpan.textContent = 'Antwortet...';
    const reactor = document.getElementById('jarvisReactor');
    if (reactor) reactor.classList.add('speaking');
    
    fetch('/api/elevenlabs/tts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-ElevenLabs-Key': apiKey
      },
      body: JSON.stringify({ text, voiceId })
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('ElevenLabs API returned ' + response.status);
      }
      return response.blob();
    })
    .then(blob => {
      if (requestId !== currentTtsRequestId) {
        console.log("ElevenLabs: Eine neuere Sprachausgabe wurde gestartet, verwerfe alte.");
        return;
      }
      
      const audioUrl = URL.createObjectURL(blob);
      elevenLabsAudio = new Audio(audioUrl);
      
      const resetSpeechUI = () => {
        const currentStatusSpan = document.getElementById('jarvisStatus');
        if (currentStatusSpan && currentStatusSpan.textContent === 'Antwortet...') {
          currentStatusSpan.textContent = 'Online';
        }
        const currentReactor = document.getElementById('jarvisReactor');
        if (currentReactor) currentReactor.classList.remove('speaking');
        if (elevenLabsAudio) {
          URL.revokeObjectURL(audioUrl);
          elevenLabsAudio = null;
        }
      };
      
      elevenLabsAudio.onended = resetSpeechUI;
      elevenLabsAudio.onerror = (e) => {
        console.error("Audio-Fehler bei ElevenLabs Playback:", e);
        resetSpeechUI();
        if (requestId === currentTtsRequestId) {
          speakLocalSpeech(text);
        }
      };
      
      elevenLabsAudio.play().catch(err => {
        console.error("Fehler beim Abspielen von ElevenLabs Audio:", err);
        resetSpeechUI();
        if (requestId === currentTtsRequestId) {
          speakLocalSpeech(text);
        }
      });
    })
    .catch(err => {
      console.error("ElevenLabs TTS-Anfrage fehlgeschlagen:", err);
      if (requestId === currentTtsRequestId) {
        const currentStatusSpan = document.getElementById('jarvisStatus');
        if (currentStatusSpan && currentStatusSpan.textContent === 'Antwortet...') {
          currentStatusSpan.textContent = 'Online';
        }
        const currentReactor = document.getElementById('jarvisReactor');
        if (currentReactor) currentReactor.classList.remove('speaking');
        speakLocalSpeech(text);
      }
    });
  } else {
    speakLocalSpeech(text);
  }
}

async function callJarvisAPI(prompt) {
  const provider = localStorage.getItem('jarvis_provider') || 'simulator';
  let apiKey = '';
  if (provider === 'gemini') {
    apiKey = localStorage.getItem('jarvis_gemini_api_key') || '';
  } else if (provider === 'openrouter') {
    apiKey = localStorage.getItem('jarvis_openrouter_api_key') || '';
  }
  const model = localStorage.getItem('jarvis_model') || 'gemini-2.5-flash';
  const customModel = localStorage.getItem('jarvis_custom_model') || '';
  const systemPrompt = localStorage.getItem('jarvis_system_prompt') || 'Du bist J.A.R.V.I.S., eine hochentwickelte KI. Antworte kurz, präzise und charmant auf Deutsch.';
  
  const activeModel = customModel.trim() || model;
  
  // Datum und Uhrzeit dynamisch ermitteln
  const now = new Date();
  const dateStr = now.toLocaleDateString('de-DE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

  // System-Prompt erweitern für allgemeine KI-Funktionalität, Uhrzeit und Smart-Home-Geräte
  let activeSystemPrompt = systemPrompt;
  activeSystemPrompt += `\nDu bist ein vollfunktionsfähiger, intelligenter Assistent. Du kannst allgemeine Fragen beantworten, Smalltalk führen, und hast zusätzlich Zugriff auf Smart-Home-Funktionen. Begrenze dich nicht selbst auf Smart-Home-Befehle.`;
  activeSystemPrompt += `\nAktuelle Zeit: ${dateStr}, ${timeStr} Uhr. Nutze diese Information, wenn der Benutzer nach Datum oder Uhrzeit fragt.`;
  
  if (typeof tasmotaDevices !== 'undefined' && tasmotaDevices.length > 0) {
    const devicesList = tasmotaDevices.map(d => `${d.name} (IP: ${d.ip})`).join(', ');
    activeSystemPrompt += `\nRegistrierte Smart-Home-Geräte (Tasmota) im Haushalt: ${devicesList}. Nutze diese exakten Bezeichnungen oder IPs für Funktionsaufrufe.`;
  }
  
  if (provider === 'simulator') {
    return new Promise((resolve) => {
      setTimeout(() => {
        const replies = [
          "Selbstverständlich, Sir. Alle lebenserhaltenden Systeme laufen im optimalen Bereich. Die Energieversorgung ist stabil bei 100%.",
          "Ich habe einen Scan des lokalen Smart-Home-Netzwerks durchgeführt. Alle Tasmota-Steckdosen und die Fritz!Box reagieren normal.",
          "Wie Sie wünschen, Sir. Soll ich die Lichter regulieren oder das Fritzbox-Anruferprotokoll für Sie aufbereiten?",
          "Sir, ich stehe Ihnen bei jeder Fragestellung zur Seite. Wie kann ich Sie heute bei Ihren Projekten unterstützen?",
          "Protokoll 11 gestartet... Scherz beiseite, Sir. Welches Gerät oder welche Statusabfrage wünschen Sie?"
        ];
        resolve(replies[Math.floor(Math.random() * replies.length)]);
      }, 1000 + Math.random() * 1000);
    });
  }
  
  if (!apiKey) {
    throw new Error("API-Schlüssel fehlt! Bitte konfiguriere ihn in den Einstellungen.");
  }
  
  // API Request - Gemini
  if (provider === 'gemini') {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${activeModel}:generateContent?key=${apiKey}`;
    
    const contents = [];
    jarvisHistory.forEach(msg => {
      contents.push({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }]
      });
    });
    contents.push({
      role: 'user',
      parts: [{ text: prompt }]
    });

    const tasmotaTools = [
      {
        functionDeclarations: [
          {
            name: "tasmota_control",
            description: "Steuert Tasmota-Smart-Home-Geräte im lokalen Netzwerk via HTTP (Ein-/Ausschalten, umschalten oder Status abfragen).",
            parameters: {
              type: "OBJECT",
              properties: {
                ip: {
                  type: "STRING",
                  description: "Die lokale IP-Adresse oder der gespeicherte Name des Geräts (z.B. '192.168.178.50' oder 'Stehlampe')"
                },
                action: {
                  type: "STRING",
                  description: "Die auszuführende Aktion: 'on' | 'off' | 'toggle' | 'status'"
                }
              },
              required: ["ip", "action"]
            }
          },
          {
            name: "tasmota_scan",
            description: "Scannt das lokale Netzwerk selbstständig nach Tasmota-Geräten und speichert die Namen und IPs in der Konfiguration.",
            parameters: {
              type: "OBJECT",
              properties: {
                subnet: {
                  type: "STRING",
                  description: "Optionales Subnetz für den Scan (z.B. '192.168.178'). Falls nicht angegeben, wird das im Dashboard konfigurierte oder das Standard-Subnetz verwendet."
                }
              }
            }
          },
          {
            name: "get_calendar_events",
            description: "Ruft die nächsten anstehenden Termine (z. B. Müllabfuhrtermine und persönliche Termine) aus dem Kalender ab.",
            parameters: {
              type: "OBJECT",
              properties: {
                limit: {
                  type: "INTEGER",
                  description: "Optionale maximale Anzahl der zurückzugebenden Termine (Standard: 4)."
                }
              }
            }
          },
          {
            name: "add_calendar_event",
            description: "Trägt einen neuen persönlichen Termin in den Kalender ein (z. B. Arzttermin, Treffen, Erinnerungen).",
            parameters: {
              type: "OBJECT",
              properties: {
                title: {
                  type: "STRING",
                  description: "Der Titel des Termins (z.B. 'Zahnarzt', 'Einkaufen', 'Treffen mit Julia')"
                },
                date: {
                  type: "STRING",
                  description: "Das Datum des Termins im Format YYYY-MM-DD"
                },
                time: {
                  type: "STRING",
                  description: "Die Uhrzeit des Termins im Format HH:MM (z.B. '14:30')"
                },
                description: {
                  type: "STRING",
                  description: "Optionale nähere Beschreibung des Termins"
                }
              },
              required: ["title", "date", "time"]
            }
          }
        ]
      }
    ];

    let loopCount = 0;
    const maxLoops = 5;

    while (loopCount < maxLoops) {
      loopCount++;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: contents,
          tools: tasmotaTools,
          systemInstruction: { parts: [{ text: activeSystemPrompt }] },
          generationConfig: { 
            maxOutputTokens: 2000,
            temperature: 0.7 
          }
        })
      });
      
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error?.message || `HTTP Fehler ${response.status}`);
      }
      
      const data = await response.json();
      const candidate = data.candidates?.[0];
      if (!candidate || !candidate.content || !candidate.content.parts) {
        throw new Error("Ungültiges Antwortformat von Gemini erhalten.");
      }

      const functionCallPart = candidate.content.parts.find(p => p.functionCall);
      
      if (functionCallPart) {
        // Model requested a function call
        contents.push(candidate.content);

        const call = functionCallPart.functionCall;
        const functionName = call.name;
        const args = call.args || {};
        let functionResult;

        try {
          if (functionName === 'tasmota_control') {
            const target = String(args.ip || '').trim();
            const action = String(args.action || 'toggle').trim().toLowerCase();
            
            if (tasmotaDevices.length === 0) {
              await fetchTasmotaList();
            }

            const isIp = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(target);
            let deviceIp = '';
            let matchedName = target;

            if (isIp) {
              deviceIp = target;
              const known = tasmotaDevices.find(d => d.ip === target);
              if (known) matchedName = known.name;
            } else if (target) {
              const searchName = target.toLowerCase();
              const matched = tasmotaDevices.find(d => 
                d.name.toLowerCase().includes(searchName) || 
                searchName.includes(d.name.toLowerCase())
              );
              if (matched) {
                deviceIp = matched.ip;
                matchedName = matched.name;
              }
            }

            if (deviceIp) {
              if (action === 'status') {
                const statusRes = await fetch('/api/tasmota/status');
                const statusArray = await statusRes.json();
                const devStatus = statusArray.find(s => s.ip === deviceIp);
                if (devStatus) {
                  functionResult = {
                    success: true,
                    deviceName: matchedName,
                    ip: deviceIp,
                    online: devStatus.online,
                    state: devStatus.state
                  };
                } else {
                  functionResult = {
                    success: true,
                    deviceName: matchedName,
                    ip: deviceIp,
                    status: "Registriert, Status konnte nicht abgefragt werden."
                  };
                }
              } else {
                let apiAction = 'TOGGLE';
                if (action === 'on') apiAction = 'ON';
                if (action === 'off') apiAction = 'OFF';

                const powerRes = await fetch('/api/tasmota/power', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ ip: deviceIp, action: apiAction })
                });
                const powerData = await powerRes.json();

                if (powerData.success) {
                  setTimeout(refreshTasmotaStatus, 100);
                  functionResult = {
                    success: true,
                    deviceName: matchedName,
                    ip: deviceIp,
                    action: action,
                    state: powerData.state
                  };
                } else {
                  functionResult = {
                    success: false,
                    error: powerData.error || "Aktion fehlgeschlagen."
                  };
                }
              }
            } else {
              functionResult = {
                success: false,
                error: `Gerät '${target}' konnte nicht gefunden werden. Registrierte Geräte: ${tasmotaDevices.map(d => d.name).join(', ') || 'Keine'}`
              };
            }
          } else if (functionName === 'tasmota_scan') {
            let base = String(args.subnet || '').trim();
            if (!base) {
              base = document.getElementById('tasmotaSubnet')?.value.trim() || '';
            }
            if (!base) {
              base = '192.168.178';
            }
            
            if (base.endsWith('.0')) base = base.slice(0, -2);
            if (base.endsWith('.')) base = base.slice(0, -1);

            const scanRes = await fetch('/api/tasmota/scan', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ baseIp: base })
            });
            const scanData = await scanRes.json();

            if (scanData.success && scanData.found) {
              let newCount = 0;
              scanData.found.forEach(f => {
                if (!tasmotaDevices.find(d => d.ip === f.ip)) {
                  tasmotaDevices.push(f);
                  newCount++;
                }
              });
              if (newCount > 0) {
                await saveTasmotaList();
              }
              setTimeout(refreshTasmotaStatus, 100);
              functionResult = {
                success: true,
                message: `Scan erfolgreich abgeschlossen in Subnetz ${base}.x. ${scanData.found.length} Geräte gefunden, davon ${newCount} neu hinzugefügt.`,
                foundDevices: scanData.found
              };
            } else {
              functionResult = {
                success: false,
                error: scanData.error || "Netzwerk-Scan fehlgeschlagen."
              };
            }
          } else if (functionName === 'get_calendar_events') {
            const limit = Number(args.limit || 6);
            let icsEvents = [];
            try {
              const res = await fetch('/api/ics-data');
              const data = await res.json();
              if (data.success && data.data) {
                const lines = data.data.split('\n');
                let inEvent = false, evt = {};
                lines.forEach(l => {
                  const line = l.trim();
                  if (line.startsWith('BEGIN:VEVENT')) { inEvent = true; evt = {}; }
                  else if (line.startsWith('END:VEVENT')) { inEvent = false; if(evt.date) icsEvents.push(evt); }
                  else if (inEvent) {
                    if (line.startsWith('SUMMARY:')) evt.summary = line.substring(8).replace('\\,', ',');
                    else { const m = line.match(/DTSTART[^:]*:(\d{8})/); if(m) evt.date = m[1]; }
                  }
                });
              }
            } catch (err) {
              console.warn("Fehler beim Laden der ICS-Daten für J.A.R.V.I.S.:", err);
            }

            let apptEvents = [];
            try {
              const res = await fetch('/api/appointments');
              if (res.ok) {
                apptEvents = await res.json();
              }
            } catch (err) {
              console.warn("Fehler beim Laden der Termine für J.A.R.V.I.S.:", err);
            }

            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const todayStrICS = today.getFullYear() + String(today.getMonth()+1).padStart(2,'0') + String(today.getDate()).padStart(2,'0');
            const todayStrAppt = today.getFullYear() + '-' + String(today.getMonth()+1).padStart(2,'0') + '-' + String(today.getDate()).padStart(2,'0');

            const formattedIcs = icsEvents
              .filter(e => e.date >= todayStrICS)
              .map(e => {
                const year = e.date.substring(0, 4);
                const month = e.date.substring(4, 6);
                const day = e.date.substring(6, 8);
                return {
                  type: "Abfalltermin",
                  date: `${year}-${month}-${day}`,
                  time: "Ganztägig",
                  title: e.summary,
                  description: "Müllabfuhr-Termin"
                };
              });

            const formattedAppts = apptEvents
              .filter(e => e.date >= todayStrAppt)
              .map(e => ({
                type: "Persönlicher Termin",
                date: e.date,
                time: e.time,
                title: e.title,
                description: e.description || ""
              }));

            const allEvents = [...formattedIcs, ...formattedAppts];

            allEvents.sort((a, b) => {
              const timeA = a.time === 'Ganztägig' ? '00:00' : a.time;
              const timeB = b.time === 'Ganztägig' ? '00:00' : b.time;
              const dateA = new Date(`${a.date}T${timeA}`);
              const dateB = new Date(`${b.date}T${timeB}`);
              return dateA - dateB;
            });

            const finalEvents = allEvents.slice(0, limit).map(e => {
              const [year, month, day] = e.date.split('-');
              return {
                type: e.type,
                date: `${day}.${month}.${year}`,
                time: e.time,
                title: e.title,
                description: e.description
              };
            });

            functionResult = {
              success: true,
              events: finalEvents
            };
          } else if (functionName === 'add_calendar_event') {
            const title = String(args.title || '').trim();
            const date = String(args.date || '').trim();
            const time = String(args.time || '').trim();
            const description = String(args.description || '').trim();

            if (!title || !date || !time) {
              functionResult = {
                success: false,
                error: "Titel, Datum und Uhrzeit sind erforderlich."
              };
            } else {
              const response = await fetch('/api/appointments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, date, time, description })
              });
              const responseData = await response.json();
              if (responseData.success) {
                functionResult = {
                  success: true,
                  message: "Termin erfolgreich hinzugefügt.",
                  appointment: responseData.appointment
                };
              } else {
                functionResult = {
                  success: false,
                  error: responseData.error || "Fehler beim Erstellen des Termins."
                };
              }
            }
          } else {
            functionResult = {
              success: false,
              error: `Unbekannte Funktion: ${functionName}`
            };
          }
        } catch (err) {
          console.error("Fehler bei tasmota_control Ausführung:", err);
          functionResult = {
            success: false,
            error: err.message
          };
        }

        contents.push({
          role: 'function',
          parts: [{
            functionResponse: {
              name: functionName,
              response: functionResult
            }
          }]
        });

        continue;
      }

      let reply = "";
      const textParts = candidate.content.parts.filter(part => !part.thought && part.text);
      if (textParts.length > 0) {
        reply = textParts.map(part => part.text).join("").trim();
      }
      
      if (!reply) {
        console.warn("Gemini Leere Antwort Daten:", data);
        const finishReason = candidate?.finishReason;
        const safetyNotice = finishReason ? ` (FinishReason: ${finishReason})` : '';
        const dataSnippet = JSON.stringify(data).substring(0, 120);
        throw new Error(`Keine Antwort von Gemini erhalten${safetyNotice}. Details: ${dataSnippet}...`);
      }
      return reply;
    }

    throw new Error("Maximale Anzahl an Funktionsaufrufen erreicht.");
  }
  
  // API Request - OpenRouter
  if (provider === 'openrouter') {
    const url = 'https://openrouter.ai/api/v1/chat/completions';
    
    const messages = [{ role: 'system', content: activeSystemPrompt }];
    jarvisHistory.forEach(msg => {
      messages.push({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.text
      });
    });
    messages.push({ role: 'user', content: prompt });
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': window.location.origin,
        'X-Title': 'Neo Deck Smart Home'
      },
      body: JSON.stringify({
        model: activeModel,
        messages: messages,
        max_tokens: 2000,
        temperature: 0.7
      })
    });
    
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error?.message || `HTTP Fehler ${response.status}`);
    }
    
    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content;
    if (!reply) throw new Error("Keine Antwort von OpenRouter erhalten.");
    return reply;
  }
  
  throw new Error("Ungültiger API-Provider konfiguriert.");
}

function updateJarvisSettingsUI() {
  const provider = document.getElementById('jarvisProvider')?.value || 'simulator';
  const keyGroup = document.getElementById('jarvisApiKeyGroup');
  const modelGroup = document.getElementById('jarvisModelGroup');
  
  if (!keyGroup || !modelGroup) return;
  
  if (provider === 'simulator') {
    keyGroup.style.display = 'none';
    modelGroup.style.display = 'none';
  } else {
    keyGroup.style.display = 'block';
    modelGroup.style.display = 'block';
    
    // Modell-Optionen filtern
    const options = document.querySelectorAll('#jarvisModel option');
    options.forEach(opt => {
      if (provider === 'gemini') {
        opt.style.display = opt.classList.contains('gemini-opt') ? 'block' : 'none';
      } else {
        opt.style.display = opt.classList.contains('openrouter-opt') ? 'block' : 'none';
      }
    });
    
    // Fallback falls ein ungültiges Modell selektiert ist und Deaktivierung für OpenRouter
    const modelElem = document.getElementById('jarvisModel');
    if (modelElem) {
      modelElem.disabled = (provider === 'openrouter');
      
      const currentModel = modelElem.value;
      const selectedOpt = document.querySelector(`#jarvisModel option[value="${currentModel}"]`);
      if (selectedOpt && selectedOpt.style.display === 'none') {
        const firstVisible = document.querySelector(`#jarvisModel option[class*="${provider}-opt"]`);
        if (firstVisible) modelElem.value = firstVisible.value;
      }
    }
  }

  const searchToggleGroup = document.getElementById('jarvisSearchToggleGroup');
  const braveKeyGroup = document.getElementById('jarvisBraveKeyGroup');
  const searchEnabled = document.getElementById('jarvisSearchEnabled')?.checked;
  
  if (provider === 'gemini') {
    if (searchToggleGroup) searchToggleGroup.style.display = 'block';
    if (braveKeyGroup) {
      braveKeyGroup.style.display = searchEnabled ? 'block' : 'none';
    }
  } else {
    if (searchToggleGroup) searchToggleGroup.style.display = 'none';
    if (braveKeyGroup) braveKeyGroup.style.display = 'none';
  }

  const ttsEnabled = document.getElementById('jarvisTtsEnabled')?.checked;
  const ttsSettingsGroup = document.getElementById('jarvisTtsSettingsGroup');
  const elevenLabsGroup = document.getElementById('jarvisElevenLabsGroup');
  const voiceSelect = document.getElementById('jarvisVoiceSelect');

  if (ttsSettingsGroup) {
    ttsSettingsGroup.style.display = ttsEnabled ? 'block' : 'none';
  }
  // Show ElevenLabs API key only if an ElevenLabs voice is selected
  if (elevenLabsGroup) {
    const selectedVal = voiceSelect?.value || '';
    elevenLabsGroup.style.display = (ttsEnabled && selectedVal.startsWith('eleven:')) ? 'block' : 'none';
  }
}

function appendJarvisMessage(sender, text, type = 'assistant') {
  const log = document.getElementById('jarvisChatLog');
  if (!log) return;
  
  const bubble = document.createElement('div');
  bubble.className = `jarvis-msg jarvis-msg-${type}`;
  bubble.style.cssText = 'animation: slideInUp 0.25s ease forwards; margin-bottom: 6px;';
  
  const senderSpan = `<span style="font-weight: 700;">${sender}:</span> `;
  bubble.innerHTML = (type === 'system' || type === 'error') ? text : senderSpan + text;
  
  log.appendChild(bubble);
  
  // Auto-Scroll
  const wrapper = log.parentElement;
  if (wrapper) {
    wrapper.scrollTop = wrapper.scrollHeight;
  }
}

async function sendJarvisMessage() {
  const input = document.getElementById('jarvisInput');
  const sendBtn = document.getElementById('jarvisSendBtn');
  const reactor = document.getElementById('jarvisReactor');
  const statusSpan = document.getElementById('jarvisStatus');
  
  if (!input || !input.value.trim()) return;
  
  const prompt = input.value.trim();
  input.value = '';
  
  // Vor dem Senden evtl. laufende Sprachausgabe stoppen
  cancelJarvisSpeech();
  
  // User Nachricht anzeigen
  appendJarvisMessage('Sir', prompt, 'user');
  
  // Buttons sperren und Reaktor-Animation starten
  if (sendBtn) sendBtn.disabled = true;
  if (reactor) reactor.classList.add('thinking');
  if (statusSpan) statusSpan.textContent = 'Denkt nach...';
  
  let speechStarted = false;
  
  try {
    // Warte mindestens 1,2 Sekunden, damit die Animation und der "Denkt nach..." Status gut wahrnehmbar sind
    const apiPromise = callJarvisAPI(prompt);
    const delayPromise = new Promise(resolve => setTimeout(resolve, 1200));
    const [reply] = await Promise.all([apiPromise, delayPromise]);
    
    // In Historie cachen und lokal speichern
    jarvisHistory.push({ role: 'user', text: prompt });
    jarvisHistory.push({ role: 'assistant', text: reply });
    if (jarvisHistory.length > 12) {
      jarvisHistory.shift();
      jarvisHistory.shift();
    }
    localStorage.setItem('jarvis_chat_history', JSON.stringify(jarvisHistory));
    
    // Antwort anzeigen & vorlesen
    appendJarvisMessage('J.A.R.V.I.S.', reply, 'assistant');
    
    const ttsEnabled = localStorage.getItem('jarvis_tts_enabled') !== 'false';
    if (ttsEnabled) {
      speechStarted = true;
    }
    speakJarvisReply(reply);
    
  } catch (err) {
    console.error("Jarvis API Fehler:", err);
    appendJarvisMessage('System', `Fehler: ${err.message}`, 'error');
    playJarvisBeep(220, 0.2, 0.1); // Fehlerbeep
  } finally {
    if (sendBtn) sendBtn.disabled = false;
    if (reactor) reactor.classList.remove('thinking');
    if (statusSpan && !speechStarted) {
      statusSpan.textContent = 'Online';
    }
  }
}

// Populate Browser (local) voices into the unified dropdown optgroup
function populateLocalVoicesGroup() {
  const group = document.getElementById('jarvisLocalVoicesGroup');
  if (!group) return;

  const allVoices = window.speechSynthesis?.getVoices() || [];
  // Sort alphabetically by language code, then name
  const sorted = [...allVoices].sort((a, b) => {
    const langCmp = a.lang.localeCompare(b.lang);
    return langCmp !== 0 ? langCmp : a.name.localeCompare(b.name);
  });

  // Remove old browser options (keep the auto option)
  Array.from(group.querySelectorAll('option:not([value="local:auto"])')).forEach(o => o.remove());

  sorted.forEach(voice => {
    const opt = document.createElement('option');
    opt.value = `local:${voice.name}`;
    opt.textContent = `${voice.name} (${voice.lang})`;
    group.appendChild(opt);
  });
}

// Populate ElevenLabs voices into the unified dropdown optgroup
function populateElevenLabsVoicesGroup(voices) {
  const group = document.getElementById('jarvisElevenVoicesGroup');
  const unifiedSelect = document.getElementById('jarvisVoiceSelect');
  if (!group) return;

  // Remove old ElevenLabs options
  group.innerHTML = '';

  if (!voices || voices.length === 0) {
    const opt = document.createElement('option');
    opt.value = 'eleven:loading';
    opt.disabled = true;
    opt.textContent = '— Keine ElevenLabs-Stimmen —';
    group.appendChild(opt);
    return;
  }

  // Sort alphabetically by name
  const sorted = [...voices].sort((a, b) => a.name.localeCompare(b.name));

  sorted.forEach(voice => {
    const opt = document.createElement('option');
    opt.value = `eleven:${voice.voice_id}`;
    const gender = voice.labels?.gender
      ? ` · ${voice.labels.gender === 'female' ? '♀' : voice.labels.gender === 'male' ? '♂' : voice.labels.gender}`
      : '';
    opt.textContent = `${voice.name}${gender}`;
    group.appendChild(opt);
  });

  // Restore saved ElevenLabs selection
  const savedVoiceId = localStorage.getItem('jarvis_eleven_voice_id');
  if (savedVoiceId && unifiedSelect) {
    const match = Array.from(unifiedSelect.options).find(o => o.value === `eleven:${savedVoiceId}`);
    if (match) unifiedSelect.value = match.value;
  }
}

// Backward-compat alias (legacy references)
function populateElevenLabsVoicesDropdown(voices) {
  populateElevenLabsVoicesGroup(voices);
}

async function loadElevenLabsVoices(apiKeyOverride = null) {
  const apiKey = apiKeyOverride || document.getElementById('jarvisElevenApiKey')?.value.trim() || localStorage.getItem('jarvis_eleven_api_key') || '';
  if (!apiKey) {
    alert('Bitte zuerst den ElevenLabs API-Key eintragen.');
    return;
  }

  const btn = document.getElementById('jarvisLoadVoicesBtn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; }

  try {
    const response = await fetch('/api/elevenlabs/voices', {
      headers: { 'X-ElevenLabs-Key': apiKey }
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'Fehler beim Laden');

    const voices = data.voices || [];
    localStorage.setItem('jarvis_eleven_voices_cache', JSON.stringify(voices));
    populateElevenLabsVoicesGroup(voices);
  } catch (err) {
    console.error('ElevenLabs Stimmen konnten nicht geladen werden:', err);
    alert('ElevenLabs Stimmen konnten nicht geladen werden: ' + err.message);
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-sync-alt"></i>'; }
  }
}

function initJarvis() {
  const input = document.getElementById('jarvisInput');
  const sendBtn = document.getElementById('jarvisSendBtn');
  const micBtn = document.getElementById('jarvisMicBtn');
  const providerSelect = document.getElementById('jarvisProvider');
  const saveBtn = document.getElementById('saveJarvisConfig');
  const clearKeyBtn = document.getElementById('jarvisClearKeyBtn');
  const clearHistoryBtn = document.getElementById('jarvisClearHistoryBtn');
  
  if (!input) return; // Widget nicht aktiv im Layout

  // Chat-Verlauf aus LocalStorage wiederherstellen und rendern
  try {
    jarvisHistory = JSON.parse(localStorage.getItem('jarvis_chat_history') || '[]');
  } catch (e) {
    jarvisHistory = [];
  }
  
  const chatLog = document.getElementById('jarvisChatLog');
  if (chatLog && jarvisHistory.length > 0) {
    chatLog.innerHTML = '';
    jarvisHistory.forEach(msg => {
      const bubble = document.createElement('div');
      bubble.className = `jarvis-msg jarvis-msg-${msg.role === 'user' ? 'user' : 'assistant'}`;
      bubble.style.cssText = 'margin-bottom: 6px;';
      const senderName = msg.role === 'user' ? 'Sir' : 'J.A.R.V.I.S.';
      bubble.innerHTML = `<span style="font-weight: 700;">${senderName}:</span> ${msg.text}`;
      chatLog.appendChild(bubble);
    });
    const wrapper = chatLog.parentElement;
    if (wrapper) {
      setTimeout(() => { wrapper.scrollTop = wrapper.scrollHeight; }, 100);
    }
  }
  
  // Stimmen-Cache im Browser frühzeitig aufwärmen
  if ('speechSynthesis' in window) {
    window.speechSynthesis.getVoices();
  }
  
  // 1. Einstellungen laden und vorbelegen
  const savedProvider = localStorage.getItem('jarvis_provider') || 'simulator';
  
  // Einmalige Migration des alten Schlüssels in den Gemini-Slot (da der alte Key immer für Gemini war)
  const legacyKey = localStorage.getItem('jarvis_api_key');
  if (legacyKey && !localStorage.getItem('jarvis_gemini_api_key')) {
    localStorage.setItem('jarvis_gemini_api_key', legacyKey);
    localStorage.removeItem('jarvis_api_key');
  }

  // Bereinigung falls durch frühere Versionen der Google Key im OpenRouter Slot gelandet ist
  const gemKey = localStorage.getItem('jarvis_gemini_api_key') || '';
  const orKey = localStorage.getItem('jarvis_openrouter_api_key') || '';
  if (orKey && (orKey === gemKey || orKey.startsWith('AIzaSy'))) {
    localStorage.removeItem('jarvis_openrouter_api_key');
  }

  let savedKey = '';
  if (savedProvider === 'gemini') {
    savedKey = localStorage.getItem('jarvis_gemini_api_key') || '';
  } else if (savedProvider === 'openrouter') {
    savedKey = localStorage.getItem('jarvis_openrouter_api_key') || '';
  }
  const savedModel = localStorage.getItem('jarvis_model') || 'gemini-2.5-flash';
  const savedCustom = localStorage.getItem('jarvis_custom_model') || '';
  // Migration alter System-Prompt (mit Tony Stark)
  let savedPrompt = localStorage.getItem('jarvis_system_prompt');
  const oldPrompt = 'Du bist JARVIS, Tony Starks hochentwickelte KI. Antworte kurz, präzise und charmant auf Deutsch.';
  const newPrompt = 'Du bist J.A.R.V.I.S., eine hochentwickelte KI. Antworte kurz, präzise und charmant auf Deutsch.';
  if (!savedPrompt || savedPrompt === oldPrompt) {
    savedPrompt = newPrompt;
    localStorage.setItem('jarvis_system_prompt', newPrompt);
  }
  const savedTts = localStorage.getItem('jarvis_tts_enabled') !== 'false';
  const savedSearch = localStorage.getItem('jarvis_search_enabled') === 'true';
  const savedBraveKey = localStorage.getItem('jarvis_brave_api_key') || '';
  const savedTtsProvider = localStorage.getItem('jarvis_tts_provider') || 'local';
  const savedElevenKey = localStorage.getItem('jarvis_eleven_api_key') || '';
  
  if (providerSelect) providerSelect.value = savedProvider;
  if (document.getElementById('jarvisApiKey')) document.getElementById('jarvisApiKey').value = savedKey;
  if (document.getElementById('jarvisModel')) document.getElementById('jarvisModel').value = savedModel;
  if (document.getElementById('jarvisCustomModel')) document.getElementById('jarvisCustomModel').value = savedCustom;
  if (document.getElementById('jarvisSystemPrompt')) document.getElementById('jarvisSystemPrompt').value = savedPrompt;
  if (document.getElementById('jarvisTtsEnabled')) document.getElementById('jarvisTtsEnabled').checked = savedTts;
  if (document.getElementById('jarvisSearchEnabled')) document.getElementById('jarvisSearchEnabled').checked = savedSearch;
  if (document.getElementById('jarvisBraveApiKey')) document.getElementById('jarvisBraveApiKey').value = savedBraveKey;
  if (document.getElementById('jarvisElevenApiKey')) document.getElementById('jarvisElevenApiKey').value = savedElevenKey;

  // Restore unified voice selection
  const savedVoiceSelection = localStorage.getItem('jarvis_unified_voice') || 'local:auto';

  // Populate local browser voices & restore selection
  const doPopulateVoices = () => {
    populateLocalVoicesGroup();
    // Restore cached ElevenLabs voices into optgroup
    try {
      const cached = localStorage.getItem('jarvis_eleven_voices_cache');
      if (cached) populateElevenLabsVoicesGroup(JSON.parse(cached));
    } catch (e) {
      console.warn('Fehler beim Laden gecachter Stimmen:', e);
    }
    // Restore saved unified voice
    const vs = document.getElementById('jarvisVoiceSelect');
    if (vs && Array.from(vs.options).some(o => o.value === savedVoiceSelection)) {
      vs.value = savedVoiceSelection;
    }
    updateJarvisSettingsUI();
  };

  if ('speechSynthesis' in window) {
    window.speechSynthesis.getVoices(); // warm up
    if (window.speechSynthesis.getVoices().length > 0) {
      doPopulateVoices();
    } else {
      window.speechSynthesis.addEventListener('voiceschanged', doPopulateVoices, { once: true });
    }
  } else {
    doPopulateVoices();
  }

  // Event-Handler für Provider Dropdown mit getrennter API-Key Verwaltung
  let currentProvider = savedProvider;
  if (providerSelect) {
    providerSelect.addEventListener('change', () => {
      const newProvider = providerSelect.value;
      const currentKey = document.getElementById('jarvisApiKey')?.value.trim() || '';
      
      // Vorherigen Key zwischenspeichern
      if (currentProvider === 'gemini') {
        localStorage.setItem('jarvis_gemini_api_key', currentKey);
      } else if (currentProvider === 'openrouter') {
        localStorage.setItem('jarvis_openrouter_api_key', currentKey);
      }
      
      currentProvider = newProvider;
      
      // Neuen Key laden
      let newKey = '';
      if (newProvider === 'gemini') {
        newKey = localStorage.getItem('jarvis_gemini_api_key') || '';
      } else if (newProvider === 'openrouter') {
        newKey = localStorage.getItem('jarvis_openrouter_api_key') || '';
      }
      
      if (document.getElementById('jarvisApiKey')) {
        document.getElementById('jarvisApiKey').value = newKey;
      }
      
      updateJarvisSettingsUI();
    });
    updateJarvisSettingsUI();
  }

  const searchCheckbox = document.getElementById('jarvisSearchEnabled');
  if (searchCheckbox) {
    searchCheckbox.addEventListener('change', updateJarvisSettingsUI);
  }

  const ttsCheckbox = document.getElementById('jarvisTtsEnabled');
  if (ttsCheckbox) {
    ttsCheckbox.addEventListener('change', updateJarvisSettingsUI);
  }

  // Unified voice select: update ElevenLabs key visibility on change
  const unifiedVoiceSelect = document.getElementById('jarvisVoiceSelect');
  if (unifiedVoiceSelect) {
    unifiedVoiceSelect.addEventListener('change', updateJarvisSettingsUI);
  }

  const loadVoicesBtn = document.getElementById('jarvisLoadVoicesBtn');
  if (loadVoicesBtn) {
    loadVoicesBtn.addEventListener('click', () => loadElevenLabsVoices());
  }

  // Save Settings Button Listener
  const saveJarvisSettings = () => {
    const provider = providerSelect.value;
    const apiKey = document.getElementById('jarvisApiKey')?.value.trim() || '';
    const model = document.getElementById('jarvisModel')?.value || 'gemini-2.5-flash';
    const customModel = document.getElementById('jarvisCustomModel')?.value.trim() || '';
    const systemPrompt = document.getElementById('jarvisSystemPrompt')?.value.trim() || '';
    const ttsEnabled = document.getElementById('jarvisTtsEnabled')?.checked;
    const searchEnabled = document.getElementById('jarvisSearchEnabled')?.checked;
    const braveApiKey = document.getElementById('jarvisBraveApiKey')?.value.trim() || '';
    const elevenApiKey = document.getElementById('jarvisElevenApiKey')?.value.trim() || '';

    // Derive TTS provider & voice ID from unified dropdown
    const unifiedVal = document.getElementById('jarvisVoiceSelect')?.value || 'local:auto';
    const ttsProvider = unifiedVal.startsWith('eleven:') ? 'elevenlabs' : 'local';
    const elevenVoice = unifiedVal.startsWith('eleven:') ? unifiedVal.replace('eleven:', '') : '';
    const localVoiceName = unifiedVal.startsWith('local:') && unifiedVal !== 'local:auto'
      ? unifiedVal.replace('local:', '') : '';

    localStorage.setItem('jarvis_provider', provider);

    // Getrennt nach aktivem Provider speichern
    if (provider === 'gemini') {
      localStorage.setItem('jarvis_gemini_api_key', apiKey);
    } else if (provider === 'openrouter') {
      localStorage.setItem('jarvis_openrouter_api_key', apiKey);
    }

    localStorage.setItem('jarvis_model', model);
    localStorage.setItem('jarvis_custom_model', customModel);
    localStorage.setItem('jarvis_system_prompt', systemPrompt);
    localStorage.setItem('jarvis_tts_enabled', ttsEnabled);
    localStorage.setItem('jarvis_search_enabled', searchEnabled);
    localStorage.setItem('jarvis_brave_api_key', braveApiKey);
    localStorage.setItem('jarvis_tts_provider', ttsProvider);
    localStorage.setItem('jarvis_eleven_api_key', elevenApiKey);
    localStorage.setItem('jarvis_eleven_voice_id', elevenVoice);
    localStorage.setItem('jarvis_local_voice_name', localVoiceName);
    localStorage.setItem('jarvis_unified_voice', unifiedVal);

    alert('J.A.R.V.I.S. Einstellungen erfolgreich gespeichert.');
    updateJarvisSettingsUI();
  };


  if (saveBtn) {
    saveBtn.addEventListener('click', saveJarvisSettings);
  }
  const saveTtsBtn = document.getElementById('saveJarvisConfigTts');
  if (saveTtsBtn) {
    saveTtsBtn.addEventListener('click', saveJarvisSettings);
  }
  const saveSearchBtn = document.getElementById('saveJarvisConfigSearch');
  if (saveSearchBtn) {
    saveSearchBtn.addEventListener('click', saveJarvisSettings);
  }
  
  // API-Key löschen Button Listener
  if (clearKeyBtn) {
    clearKeyBtn.addEventListener('click', () => {
      const apiKeyInput = document.getElementById('jarvisApiKey');
      if (apiKeyInput) {
        apiKeyInput.value = '';
      }
      const provider = providerSelect ? providerSelect.value : 'gemini';
      if (provider === 'gemini') {
        localStorage.removeItem('jarvis_gemini_api_key');
      } else if (provider === 'openrouter') {
        localStorage.removeItem('jarvis_openrouter_api_key');
      }
      alert("API-Schlüssel für diesen Provider erfolgreich gelöscht.");
      updateJarvisSettingsUI();
    });
  }
  
  // Chatverlauf löschen Button Listener
  if (clearHistoryBtn) {
    clearHistoryBtn.addEventListener('click', () => {
      jarvisHistory = [];
      localStorage.removeItem('jarvis_chat_history');
      const chatLog = document.getElementById('jarvisChatLog');
      if (chatLog) {
        chatLog.innerHTML = '<div class="jarvis-msg jarvis-msg-system" style="color: var(--primary); font-weight: 500;"><span style="color: var(--primary); font-weight: 700;">J.A.R.V.I.S.:</span> Chatverlauf wurde gelöscht.</div>';
      }
      alert("Chatverlauf erfolgreich gelöscht.");
    });
  }
  
  // 2. Chat-Interaktion (Send)
  if (sendBtn) sendBtn.addEventListener('click', sendJarvisMessage);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      sendJarvisMessage();
    }
  });
  
  // 3. Web Speech Recognition initialisieren
  if (micBtn) {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
      jarvisRecognition = new SpeechRec();
      jarvisRecognition.continuous = false;
      jarvisRecognition.interimResults = false;
      
      // Sprache anpassen
      const updateSpeechLang = () => {
        const lang = localStorage.getItem('dashboard_lang') || 'de';
        jarvisRecognition.lang = lang === 'de' ? 'de-DE' : 'en-US';
      };
      updateSpeechLang();
      
      // Bei Sprachwechsel im Dashboard updaten
      const langSel = document.getElementById('langSelector');
      if (langSel) {
        langSel.addEventListener('change', updateSpeechLang);
      }
      
      jarvisRecognition.onstart = () => {
        micBtn.classList.add('listening');
        const reactor = document.getElementById('jarvisReactor');
        if (reactor) reactor.classList.add('listening');
        const statusSpan = document.getElementById('jarvisStatus');
        if (statusSpan) statusSpan.textContent = 'Hört zu...';
        playJarvisBeep(440, 0.1, 0.15); // Startbeeps
      };
      
      jarvisRecognition.onend = () => {
        micBtn.classList.remove('listening');
        const reactor = document.getElementById('jarvisReactor');
        if (reactor) reactor.classList.remove('listening');
        const statusSpan = document.getElementById('jarvisStatus');
        if (statusSpan) statusSpan.textContent = 'Online';
      };
      
      jarvisRecognition.onresult = (event) => {
        const resultText = event.results[0][0].transcript;
        input.value = resultText;
        playJarvisBeep(880, 0.08, 0.12); // Erfolgsbeep
        sendJarvisMessage();
      };
      
      jarvisRecognition.onerror = (e) => {
        console.error("SpeechRecognition Fehler:", e);
        playJarvisBeep(220, 0.25, 0.15); // Fehlerbeep
      };
      
      micBtn.addEventListener('click', () => {
        try {
          if (micBtn.classList.contains('listening')) {
            jarvisRecognition.stop();
          } else {
            // Falls Jarvis gerade liest, vor dem Zuhören stoppen
            cancelJarvisSpeech();
            jarvisRecognition.start();
          }
        } catch (err) {
          console.warn("Fehler beim Starten der Spracherkennung:", err);
        }
      });
    } else {
      // Browser unterstützt keine Spracherkennung
      micBtn.style.opacity = '0.3';
      micBtn.title = "Spracherkennung im Browser nicht unterstützt";
      micBtn.addEventListener('click', () => {
        alert("Spracherkennung wird von diesem Browser leider nicht unterstützt.");
      });
    }
  }
}

// ==========================================
// TERMINE / CALENDAR WIDGET & REMINDERS LOGIC
// ==========================================

let appointmentsList = [];
let checkedCalendarReminders = new Set();

function initCalendar() {
  const addEventBtn = document.getElementById('addEventBtn');
  const closeCalendarModal = document.getElementById('closeCalendarModal');
  const cancelApptBtn = document.getElementById('cancelApptBtn');
  const calendarAddForm = document.getElementById('calendarAddForm');
  const calendarAddModal = document.getElementById('calendarAddModal');

  if (addEventBtn) {
    addEventBtn.addEventListener('click', () => {
      // Set default date to today
      const today = new Date().toISOString().split('T')[0];
      const dateInput = document.getElementById('apptDate');
      if (dateInput) dateInput.value = today;

      // Clear other fields
      const titleInput = document.getElementById('apptTitle');
      const descInput = document.getElementById('apptDesc');
      const timeInput = document.getElementById('apptTime');
      if (titleInput) titleInput.value = '';
      if (descInput) descInput.value = '';
      if (timeInput) timeInput.value = '12:00';

      if (calendarAddModal) calendarAddModal.removeAttribute('hidden');
    });
  }

  const hideModal = () => {
    if (calendarAddModal) calendarAddModal.setAttribute('hidden', '');
  };

  if (closeCalendarModal) closeCalendarModal.addEventListener('click', hideModal);
  if (cancelApptBtn) cancelApptBtn.addEventListener('click', hideModal);

  if (calendarAddForm) {
    calendarAddForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = document.getElementById('apptTitle')?.value.trim();
      const date = document.getElementById('apptDate')?.value;
      const time = document.getElementById('apptTime')?.value;
      const description = document.getElementById('apptDesc')?.value.trim();

      if (!title || !date || !time) return;

      try {
        const response = await fetch('/api/appointments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, date, time, description })
        });
        const data = await response.json();
        if (data.success) {
          hideModal();
          fetchAppointments();
        } else {
          alert(data.error || "Fehler beim Speichern des Termins.");
        }
      } catch (err) {
        console.error("Error creating appointment:", err);
      }
    });
  }

  // Socket listener for real-time updates
  socket.on('appointments-updated', (appointments) => {
    appointmentsList = appointments;
    renderAppointments(appointments);
  });

  // Load initially
  fetchAppointments();

  // Start checking for reminders every 30 seconds
  setInterval(checkCalendarReminders, 30000);
}

async function fetchAppointments() {
  try {
    const response = await fetch('/api/appointments');
    if (response.ok) {
      appointmentsList = await response.json();
      renderAppointments(appointmentsList);
    }
  } catch (err) {
    console.error("Error fetching appointments:", err);
  }
}

function renderAppointments(appointments) {
  const container = document.getElementById('calendarBody');
  if (!container) return;

  container.innerHTML = '';

  if (!appointments || appointments.length === 0) {
    const noEvents = document.createElement('div');
    noEvents.className = 'calendar-no-events';
    noEvents.setAttribute('data-i18n', 'calendar_no_events');
    noEvents.textContent = getLangText('calendar_no_events');
    container.appendChild(noEvents);
    return;
  }

  const list = document.createElement('div');
  list.className = 'calendar-list';

  appointments.forEach(appt => {
    const item = document.createElement('div');
    item.className = 'calendar-item';

    // Format date nicely (DD.MM.)
    const [year, month, day] = appt.date.split('-');
    const formattedDate = `${day}.${month}.`;

    item.innerHTML = `
      <div class="calendar-item-info">
        <div class="calendar-item-header">
          <span class="calendar-item-time">${appt.time}</span>
          <span class="calendar-item-date">${formattedDate}</span>
          <div class="calendar-item-title">${appt.title}</div>
        </div>
        ${appt.description ? `<div class="calendar-item-desc">${appt.description}</div>` : ''}
      </div>
      <div class="calendar-item-actions">
        <button class="calendar-item-del-btn" onclick="deleteAppointment('${appt.id}')" title="Löschen">
          <i class="fas fa-trash-alt"></i>
        </button>
      </div>
    `;
    list.appendChild(item);
  });

  container.appendChild(list);
}

async function deleteAppointment(id) {
  if (!confirm(getLangText('deletePersonConfirm') || 'Termin wirklich löschen?')) return;
  try {
    const response = await fetch(`/api/appointments/${id}`, {
      method: 'DELETE'
    });
    const data = await response.json();
    if (data.success) {
      fetchAppointments();
    } else {
      alert(data.error || "Fehler beim Löschen des Termins.");
    }
  } catch (err) {
    console.error("Error deleting appointment:", err);
  }
}

// Make globally accessible for inline onclick
window.deleteAppointment = deleteAppointment;

function checkCalendarReminders() {
  const now = new Date();
  const todayStr = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + '-' + String(now.getDate()).padStart(2,'0');
  const currentTimeStr = String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0');

  appointmentsList.forEach(appt => {
    const key = appt.id + '_' + appt.date + '_' + appt.time;
    if (appt.date === todayStr && appt.time === currentTimeStr && !checkedCalendarReminders.has(key)) {
      checkedCalendarReminders.add(key);
      triggerCalendarReminder(appt);
    }
  });
}

function triggerCalendarReminder(appt) {
  // 1. Show toast notification on the client side
  showReminderToast(appt);

  // 2. Play warning beep
  playJarvisBeep(660, 0.15, 0.2);
  setTimeout(() => playJarvisBeep(660, 0.15, 0.2), 250);

  // 3. J.A.R.V.I.S speaking reminder (Text-to-Speech)
  const lang = localStorage.getItem('dashboard_lang') || 'de';
  let speakText = `Sir, ich erinnere Sie an Ihren Termin: ${appt.title}`;
  if (appt.description) speakText += `. Details: ${appt.description}`;
  if (lang !== 'de') {
    speakText = `Sir, reminding you of your appointment: ${appt.title}`;
    if (appt.description) speakText += `. Details: ${appt.description}`;
  }

  const ttsEnabled = localStorage.getItem('jarvis_tts_enabled') !== 'false';
  if (ttsEnabled) {
    speakJarvisReply(speakText);
  }
}

function showReminderToast(appt) {
  // Remove existing toast if present
  const existing = document.getElementById('reminderToast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'reminderToast';
  toast.className = 'calendar-reminder-toast';
  
  toast.innerHTML = `
    <div class="calendar-reminder-icon"><i class="fas fa-bell"></i></div>
    <div class="calendar-reminder-info">
      <h4>${appt.title}</h4>
      <p>${appt.time} ${appt.description ? ` - ${appt.description}` : ''}</p>
    </div>
  `;

  document.body.appendChild(toast);

  // Animate in
  setTimeout(() => toast.classList.add('show'), 100);

  // Auto-remove after 10 seconds
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  }, 10000);
}

