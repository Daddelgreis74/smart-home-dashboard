import { Config } from './config.js';
import { getLangText } from './utils.js';

export let isPlaying = false;
export let hlsCore = null;
export let activeAudioElement = null;

export const DEFAULT_PRESETS = [
  { name: 'MDR JUMP', url: 'http://mdr-284320-0.cast.mdr.de/mdr/284320/0/mp3/high/stream.mp3', genre: 'Pop & aktuelle Hits' },
  { name: 'Antenne TH', url: 'https://top.antennethueringen.de/live/mp3-192/', genre: 'Hits & Regional' },
  { name: '80s80s', url: 'http://stream.80s80s.de/80s80s/mp3-192/', genre: 'Real 80s Sound' },
  { name: 'WDR 2', url: 'http://wdr-wdr2-koeln.cast.addradio.de/wdr/wdr2/koeln/mp3/128/stream.mp3', genre: 'News & Pop' }
];

export function getPresets() {
  try {
    const stored = localStorage.getItem('radio_presets');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {}
  return DEFAULT_PRESETS;
}

export function highlightActivePreset() {
  const currentUrl = localStorage.getItem('streamUrl');
  const pills = document.querySelectorAll('#radioPresetPills .preset-pill');
  pills.forEach(pill => {
    const pillUrl = pill.getAttribute('data-url');
    if (isPlaying && pillUrl === currentUrl) {
      pill.classList.add('active');
    } else {
      pill.classList.remove('active');
    }
  });
}

export function updateRadioUi(playing) {
  isPlaying = playing;
  const playBtn = document.getElementById('widgetPlayPauseBtn');
  const playBtnIcon = playBtn ? playBtn.querySelector('i') : null;
  const badgeLive = document.getElementById('badgeRadioLive');
  const statusText = document.getElementById('valRadioStatusText');
  const vinylDisc = document.getElementById('radioVinylDisc');
  const miniEq = document.getElementById('radioMiniEq');
  const heroCard = document.querySelector('.radio-card-hero');
  const genreText = document.getElementById('valRadioGenreText');
  
  if (playBtnIcon) {
    playBtnIcon.className = playing ? 'fas fa-stop' : 'fas fa-play';
  }
  if (playBtn) {
    if (playing) {
      playBtn.classList.add('playing');
    } else {
      playBtn.classList.remove('playing');
    }
  }

  if (badgeLive) {
    if (playing) {
      badgeLive.classList.add('live');
    } else {
      badgeLive.classList.remove('live');
    }
  }

  const lang = Config.get('dashboard_lang', 'de');
  const trans = window.translations || {};
  const t = trans[lang] || {};

  if (statusText) {
    statusText.textContent = playing ? (t.radio_status_live || 'LIVE') : (t.radio_status_standby || 'STANDBY');
  }

  if (genreText) {
    if (!playing) {
      genreText.textContent = t.radio_ready_to_play || 'Bereit zum Abspielen';
    } else {
      const activeGenre = localStorage.getItem('streamGenre') || 'Live Web Stream';
      genreText.textContent = activeGenre;
    }
  }

  if (vinylDisc) {
    if (playing) {
      vinylDisc.classList.add('spinning');
    } else {
      vinylDisc.classList.remove('spinning');
    }
  }

  if (miniEq) {
    if (playing) {
      miniEq.classList.add('active');
    } else {
      miniEq.classList.remove('active');
    }
  }

  if (heroCard) {
    if (playing) {
      heroCard.classList.add('playing');
    } else {
      heroCard.classList.remove('playing');
    }
  }

  highlightActivePreset();
}

export function stopRadioPlayback(removeSource = true) {
  if (hlsCore) {
    try { hlsCore.stopLoad(); hlsCore.detachMedia(); hlsCore.destroy(); } catch(e) {}
    hlsCore = null;
  }

  if (activeAudioElement) {
    try { activeAudioElement.pause(); } catch(e) {}
    if (removeSource) {
      try {
        activeAudioElement.removeAttribute('src');
        activeAudioElement.load();
        activeAudioElement.remove();
      } catch(e) {}
      activeAudioElement = null;
      const container = document.getElementById('audioPlayerContainer');
      if (container) container.replaceChildren();
    }
  }

  if ('mediaSession' in navigator) {
    navigator.mediaSession.playbackState = 'none';
  }

  updateRadioUi(false);
}

export function initRadioWakeGuards() {
  const hardStop = () => stopRadioPlayback(true);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) hardStop();
  });
  window.addEventListener('pagehide', hardStop);
  window.addEventListener('pageshow', hardStop);
  document.addEventListener('freeze', hardStop);
}

export function initAudioPlayer() {
  // Built-in controls through widget and popup
}

export function playAudioStream(url, name = '', autoPlay = false, genre = '') {
  const container = document.getElementById('audioPlayerContainer');
  if (!container) return;
  if (!autoPlay) return;
  
  stopRadioPlayback(true);

  if (name) {
    localStorage.setItem('streamUrl', url);
    localStorage.setItem('streamName', name);
    const stationLabel = document.getElementById('widgetRadioStation');
    if (stationLabel) stationLabel.textContent = name;
  }

  let selectedGenre = genre;
  if (!selectedGenre) {
    const presets = getPresets();
    const match = presets.find(p => p.url === url || p.name === name);
    if (match && match.genre) selectedGenre = match.genre;
    else selectedGenre = 'Live Web Stream';
  }
  localStorage.setItem('streamGenre', selectedGenre);
  const genreEl = document.getElementById('valRadioGenreText');
  if (genreEl) genreEl.textContent = selectedGenre;

  let playUrl = url;
  if (window.location.protocol === 'https:' && url.startsWith('http://')) {
    playUrl = '/api/radio/proxy-stream?url=' + encodeURIComponent(url);
    console.log('[Radio] Secured HTTP audio stream via proxy:', playUrl);
  }

  activeAudioElement = document.createElement('audio');
  activeAudioElement.id = 'audioPlayer';
  activeAudioElement.preload = 'none';
  activeAudioElement.autoplay = false;
  activeAudioElement.controls = false;
  activeAudioElement.setAttribute('playsinline', '');
  
  const savedVol = localStorage.getItem('radioVolume') || '50';
  activeAudioElement.volume = savedVol / 100;

  // Native event listeners to keep UI and Media Session in sync on Bluetooth actions
  activeAudioElement.addEventListener('play', () => {
    updateRadioUi(true);
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'playing';
    }
  });

  activeAudioElement.addEventListener('pause', () => {
    updateRadioUi(false);
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'paused';
    }
  });
  
  container.replaceChildren(activeAudioElement);

  if (url.includes('.m3u8') || url.includes('.m3u')) {
    const HlsClass = window.Hls;
    if (HlsClass && HlsClass.isSupported()) { 
        hlsCore = new HlsClass({ autoStartLoad: false }); 
        hlsCore.loadSource(playUrl); 
        hlsCore.attachMedia(activeAudioElement); 
        hlsCore.startLoad();
    }
    else if (activeAudioElement.canPlayType('application/vnd.apple.mpegurl')) {
        activeAudioElement.src = playUrl;
    }
  } else {
      activeAudioElement.src = playUrl;
  }
  
  const playPromise = activeAudioElement.play();
  if (playPromise !== undefined) {
      playPromise.then(() => {
        setupMediaSession(name);
      }).catch(e => {
          console.error("Radio Start", e);
          stopRadioPlayback(true);
      });
  }
}

function setupMediaSession(name) {
  if ('mediaSession' in navigator) {
    try {
      const origin = window.location.origin;
      navigator.mediaSession.metadata = new MediaMetadata({
        title: name || 'Live Radio',
        artist: 'Smart Home Dashboard',
        album: 'Radio Stream',
        artwork: [
          { src: origin + '/favicon.ico', sizes: '64x64', type: 'image/x-icon' }
        ]
      });

      navigator.mediaSession.playbackState = 'playing';

      navigator.mediaSession.setActionHandler('play', () => {
        if (activeAudioElement) {
          activeAudioElement.play().catch(err => console.error('[Radio] MediaSession Play failed:', err));
        } else {
          const savedUrl = localStorage.getItem('streamUrl');
          const savedName = localStorage.getItem('streamName');
          if (savedUrl) {
            playAudioStream(savedUrl, savedName, true);
          }
        }
      });

      navigator.mediaSession.setActionHandler('pause', () => {
        if (activeAudioElement) {
          activeAudioElement.pause();
        }
      });

      navigator.mediaSession.setActionHandler('stop', () => {
        stopRadioPlayback(true);
      });
    } catch (err) {
      console.warn('[Radio] MediaSession API failed to initialize:', err);
    }
  }
}

let sleepTimerId = null;
let sleepTimerMinutes = 0;

export function renderPresetPills() {
  const container = document.getElementById('radioPresetPills');
  if (!container) return;
  const presets = getPresets();
  container.innerHTML = '';
  
  presets.slice(0, 4).forEach((preset, idx) => {
    const pill = document.createElement('div');
    pill.className = 'preset-pill';
    pill.setAttribute('data-url', preset.url);
    pill.setAttribute('data-name', preset.name);
    pill.setAttribute('data-genre', preset.genre || '');
    
    pill.innerHTML = `
      <span class="pill-num">P${idx + 1}</span>
      <span class="pill-name" title="${preset.name}">${preset.name}</span>
    `;
    
    pill.addEventListener('click', () => {
      const currentUrl = localStorage.getItem('streamUrl');
      if (isPlaying && currentUrl === preset.url) {
        stopRadioPlayback(true);
      } else {
        playAudioStream(preset.url, preset.name, true, preset.genre);
      }
    });
    
    container.appendChild(pill);
  });
  
  highlightActivePreset();
}

export function initSleepTimer() {
  const btn = document.getElementById('btnRadioSleepTimer');
  const badge = document.getElementById('badgeSleepTimer');
  if (!btn) return;
  
  btn.addEventListener('click', () => {
    if (sleepTimerMinutes === 0) {
      sleepTimerMinutes = 15;
    } else if (sleepTimerMinutes === 15) {
      sleepTimerMinutes = 30;
    } else if (sleepTimerMinutes === 30) {
      sleepTimerMinutes = 60;
    } else {
      sleepTimerMinutes = 0;
    }
    
    if (sleepTimerId) {
      clearTimeout(sleepTimerId);
      sleepTimerId = null;
    }
    
    if (badge) {
      if (sleepTimerMinutes > 0) {
        badge.style.display = 'block';
        badge.textContent = `${sleepTimerMinutes}m`;
        btn.style.borderColor = 'var(--accent-blue)';
        btn.style.color = 'var(--accent-blue)';
      } else {
        badge.style.display = 'none';
        btn.style.borderColor = '';
        btn.style.color = '';
      }
    }
    
    if (sleepTimerMinutes > 0) {
      console.log(`[Radio] Sleep-Timer aktiviert: ${sleepTimerMinutes} Min.`);
      sleepTimerId = setTimeout(() => {
        console.log('[Radio] Sleep-Timer abgelaufen: Stoppe Wiedergabe');
        stopRadioPlayback(true);
        sleepTimerMinutes = 0;
        if (badge) badge.style.display = 'none';
        if (btn) {
          btn.style.borderColor = '';
          btn.style.color = '';
        }
      }, sleepTimerMinutes * 60 * 1000);
    }
  });
}

export function initRadioWidget(socket) {
  let savedName = localStorage.getItem('streamName');
  const stationLabel = document.getElementById('widgetRadioStation');
  
  if (savedName === 'null' || savedName === 'undefined' || !savedName || savedName.trim() === '') {
    savedName = 'FRITZ!Box Radio';
  }
  
  if (stationLabel) {
    stationLabel.textContent = savedName;
  }

  // Initial Presets & Sleep Timer Setup
  renderPresetPills();
  initSleepTimer();

  // Register initial Media Session play handler for Bluetooth controllers
  if ('mediaSession' in navigator) {
    navigator.mediaSession.setActionHandler('play', () => {
      const savedUrl = localStorage.getItem('streamUrl');
      const savedName = localStorage.getItem('streamName');
      if (savedUrl) {
        playAudioStream(savedUrl, savedName, true);
      }
    });
  }

  const widgetVolume = document.getElementById('widgetVolumeSlider');
  const volIcon = document.getElementById('iconRadioVolume');
  let preMuteVolume = 50;

  if (widgetVolume) {
    const savedVol = localStorage.getItem('radioVolume') || '50';
    widgetVolume.value = savedVol;
    
    const updateVolIcon = (vol) => {
      if (!volIcon) return;
      const v = Number(vol);
      if (v === 0) {
        volIcon.className = 'fas fa-volume-mute';
      } else if (v < 50) {
        volIcon.className = 'fas fa-volume-down';
      } else {
        volIcon.className = 'fas fa-volume-up';
      }
    };

    updateVolIcon(savedVol);

    widgetVolume.addEventListener('input', (e) => {
      const vol = e.target.value;
      localStorage.setItem('radioVolume', vol);
      updateVolIcon(vol);
      if (activeAudioElement) {
        activeAudioElement.volume = vol / 100;
      }
      const popupVolume = document.getElementById('popupVolumeSlider');
      if (popupVolume) popupVolume.value = vol;
    });

    if (volIcon) {
      volIcon.addEventListener('click', () => {
        const currentVol = parseInt(widgetVolume.value, 10);
        if (currentVol > 0) {
          preMuteVolume = currentVol;
          widgetVolume.value = 0;
        } else {
          widgetVolume.value = preMuteVolume > 0 ? preMuteVolume : 50;
        }
        widgetVolume.dispatchEvent(new Event('input'));
      });
    }
  }

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
          const chooseBtn = document.getElementById('chooseStationBtn');
          if (chooseBtn) chooseBtn.click();
        }
      }
    });
  }

  // Listen for socket commands from external REST API triggers (Tasker/MacroDroid Webhooks)
  const ioSocket = socket || window.socket;
  if (ioSocket) {
    ioSocket.on('radio-control', (data) => {
      console.log('[Radio] Received external socket command:', data.action);
      if (data.action === 'play') {
        const url = localStorage.getItem('streamUrl');
        const name = localStorage.getItem('streamName') || 'FRITZ!Box Radio';
        if (url) {
          playAudioStream(url, name, true);
        }
      } else if (data.action === 'pause' || data.action === 'stop') {
        stopRadioPlayback(true);
      } else if (data.action === 'toggle') {
        const audioEl = document.getElementById('audioPlayer');
        const isCurrentlyPlaying = audioEl && !audioEl.paused;
        if (isCurrentlyPlaying) {
          stopRadioPlayback(true);
        } else {
          const url = localStorage.getItem('streamUrl');
          const name = localStorage.getItem('streamName') || 'FRITZ!Box Radio';
          if (url) {
            playAudioStream(url, name, true);
          }
        }
      }
    });
  }
}

export function initFritzRadioPopup() {
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

  if (popupVolume) {
    const savedVol = localStorage.getItem('radioVolume') || '50';
    popupVolume.value = savedVol;
    
    popupVolume.addEventListener('input', (e) => {
      const vol = e.target.value;
      localStorage.setItem('radioVolume', vol);
      if (activeAudioElement) {
        activeAudioElement.volume = vol / 100;
      }
      const widgetVolume = document.getElementById('widgetVolumeSlider');
      if (widgetVolume) widgetVolume.value = vol;
    });
  }

  chooseBtn.addEventListener('click', async () => {
    overlay.removeAttribute('hidden');
    if (countBadge) countBadge.textContent = 'Laden...';
    if (grid) grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); font-size: 13px; padding: 20px;"><i class="fas fa-spinner fa-spin"></i> Senderliste wird geladen...</div>';
    if (infoCard) infoCard.style.display = 'none';

    if (popupVolume) {
      popupVolume.value = localStorage.getItem('radioVolume') || '50';
    }

    try {
      const res = await fetch('/api/fritzbox/radio');
      const data = await res.json();
      if (grid) grid.innerHTML = '';

      let stations = data.stations || [];
      if (stations.length === 0) {
        if (infoCard) infoCard.style.display = 'flex';
        if (countBadge) countBadge.textContent = '0 Sender in FRITZ!Box (Demo geladen)';
        renderStations(demoStations, true);
      } else {
        if (infoCard) infoCard.style.display = 'none';
        if (countBadge) countBadge.textContent = stations.length + ' Sender gefunden';
        if (!localStorage.getItem('radio_presets')) {
          const autoPresets = stations.slice(0, 4).map(s => ({
            name: s.name,
            url: s.url,
            genre: 'FRITZ!Box Radio'
          }));
          localStorage.setItem('radio_presets', JSON.stringify(autoPresets));
          renderPresetPills();
        }
        renderStations(stations, false);
      }
    } catch (e) {
      console.error('[Radio Overlay] Ladefehler:', e);
      if (grid) grid.innerHTML = '';
      if (infoCard) infoCard.style.display = 'flex';
      if (countBadge) countBadge.textContent = 'Ladefehler (Demo geladen)';
      renderStations(demoStations, true);
    }
  });

  function renderStations(list, isDemo) {
    if (!grid) return;
    const currentUrl = localStorage.getItem('streamUrl');
    grid.innerHTML = '';

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
