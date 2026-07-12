import { Config } from './config.js';

export const localLangMap = {
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
    tasmotaAlreadyReg: "périphérique(s) trouvé(s), aber tous sont déjà enregistrés.",
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
    tasmotaNone: "Nie znaleziono urządzeń Tasmota w sieci. Upewnij sich, że są włączone i w tej samej sieci Wi-Fi.",
    tasmotaScanErr: "Błąd skanowania sieci.",
    weatherLimit: "Osiągnięto limit",
    taupunkt: "Punkt rosy"
  }
};

export const extraTranslations = {
  de: {
    sensor_name_placeholder: "z.B. Wohnzimmer",
    sensor_humidity_unit: "Feuchte",
    sensor_add_btn: "Sensor hinzufügen",
    saved: "Gespeichert!"
  },
  en: {
    sensor_name_placeholder: "e.g. Living Room",
    sensor_humidity_unit: "Humidity",
    sensor_add_btn: "Add Sensor",
    saved: "Saved!"
  },
  fr: {
    sensor_name_placeholder: "ex. Salon",
    sensor_humidity_unit: "Humidité",
    sensor_add_btn: "Ajouter",
    saved: "Enregistré !"
  },
  es: {
    sensor_name_placeholder: "ej. Sala",
    sensor_humidity_unit: "Humedad",
    sensor_add_btn: "Añadir",
    saved: "¡Guardado!"
  },
  it: {
    sensor_name_placeholder: "es. Soggiorno",
    sensor_humidity_unit: "Umidità",
    sensor_add_btn: "Aggiungi",
    saved: "Salvato!"
  },
  nl: {
    sensor_name_placeholder: "bijv. Woonkamer",
    sensor_humidity_unit: "Vochtigheid",
    sensor_add_btn: "Toevoegen",
    saved: "Opgeslagen!"
  },
  pl: {
    sensor_name_placeholder: "np. Salon",
    sensor_humidity_unit: "Wilgotność",
    sensor_add_btn: "Dodaj",
    saved: "Zapisano!"
  }
};

export function getLangText(key) {
  const lang = Config.get('dashboard_lang', 'de');
  if (extraTranslations[lang] && extraTranslations[lang][key] !== undefined) {
    return extraTranslations[lang][key];
  }
  if (localLangMap[lang] && localLangMap[lang][key] !== undefined) {
    return localLangMap[lang][key];
  }
  return (extraTranslations['de'] && extraTranslations['de'][key]) || localLangMap['de'][key] || key;
}

export function applyTheme(themeClass) {
  document.body.classList.remove('theme-aurora', 'theme-cyberpunk', 'theme-nordic', 'theme-retrowave', 'theme-terminal', 'theme-stealth');
  document.body.classList.add(themeClass);
  localStorage.setItem('dashboard_theme', themeClass);
}

export function updateDateTime() {
  const now = new Date();
  const lang = Config.get('dashboard_lang', 'de');

  const optionsTime = { hour: '2-digit', minute: '2-digit' };
  const optionsDate = { weekday: 'long', day: '2-digit', month: 'short' };

  let locale = 'de-DE';
  if (lang === 'en') locale = 'en-US';
  else if (lang === 'fr') locale = 'fr-FR';
  else if (lang === 'es') locale = 'es-ES';
  else if (lang === 'it') locale = 'it-IT';
  else if (lang === 'nl') locale = 'nl-NL';
  else if (lang === 'pl') locale = 'pl-PL';

  const timeString = now.toLocaleTimeString(locale, optionsTime);
  const dateString = now.toLocaleDateString(locale, optionsDate).toUpperCase();

  const timeEl = document.getElementById('headerTime');
  const dateEl = document.getElementById('headerDate');

  if (timeEl) timeEl.textContent = timeString;
  if (dateEl) dateEl.textContent = dateString;
}

export function playPresencePing() {
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

export function playJarvisBeep(freq, duration, volume = 0.15) {
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

export function getTimestampedUrl(url) {
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

export function playSound(soundType) {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    if (soundType === 'sound-gong') {
      const freqs = [220, 275];
      freqs.forEach(freq => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.8, ctx.currentTime + 2.0);
        gain.gain.setValueAtTime(0.5, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.0);
        osc.start();
        osc.stop(ctx.currentTime + 2.0);
      });
    } else if (soundType === 'sound-beep') {
      const times = [0, 0.25];
      times.forEach(t => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime + t);
        gain.gain.setValueAtTime(0, ctx.currentTime + t);
        gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + t + 0.02);
        gain.gain.setValueAtTime(0.3, ctx.currentTime + t + 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.18);
        osc.start(ctx.currentTime + t);
        osc.stop(ctx.currentTime + t + 0.2);
      });
    } else if (soundType === 'sound-bell') {
      const strikeCount = 12;
      const strikeSpacing = 0.08;
      const frequencies = [987.77, 1318.51, 1567.98];
      for (let i = 0; i < strikeCount; i++) {
        const t = i * strikeSpacing;
        frequencies.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + t);
          gain.gain.setValueAtTime(0, ctx.currentTime + t);
          gain.gain.linearRampToValueAtTime(0.15 / (idx + 1), ctx.currentTime + t + 0.005);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.07);
          osc.start(ctx.currentTime + t);
          osc.stop(ctx.currentTime + t + 0.08);
        });
      }
    } else if (soundType === 'sound-chime') {
      const notes = [440, 554.37, 659.25];
      notes.forEach((freq, i) => {
        const t = i * 0.15;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + t);
        gain.gain.setValueAtTime(0, ctx.currentTime + t);
        gain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 1.2);
        osc.start(ctx.currentTime + t);
        osc.stop(ctx.currentTime + t + 1.2);
      });
    } else if (soundType === 'sound-flute') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      
      lfo.frequency.setValueAtTime(5, ctx.currentTime);
      lfoGain.gain.setValueAtTime(10, ctx.currentTime);
      
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.3, ctx.currentTime + 1.2);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.8);
      
      lfo.start();
      osc.start();
      lfo.stop(ctx.currentTime + 1.8);
      osc.stop(ctx.currentTime + 1.8);
    } else if (soundType === 'sound-radar') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(300, ctx.currentTime + 0.8);
      
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05);
      gain.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.4);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.8);
    }
  } catch (err) {
    console.error("Fehler bei playSound:", err);
  }
}
