import { Config } from './config.js';
import { getLangText } from './utils.js';

export let isPlaying = false;
export let hlsCore = null;
export let activeAudioElement = null;

export function updateRadioUi(playing) {
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
    const lang = Config.get('dashboard_lang', 'de');
    const trans = window.translations || {};
    statusLabel.textContent = playing ? (trans[lang] ? trans[lang].radio_status_live || 'LIVE' : 'LIVE') : (trans[lang] ? trans[lang].radio_status_choose || 'Sender wählen' : 'Sender wählen');
    statusLabel.style.color = playing ? 'var(--primary)' : 'var(--accent-blue)';
  }
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

export function playAudioStream(url, name = '', autoPlay = false) {
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

export function initRadioWidget(socket) {
  let savedName = localStorage.getItem('streamName');
  const stationLabel = document.getElementById('widgetRadioStation');
  
  if (savedName === 'null' || savedName === 'undefined' || !savedName || savedName.trim() === '') {
    savedName = 'FRITZ!Box Radio';
  }
  
  if (stationLabel) {
    stationLabel.textContent = savedName;
  }

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
  if (widgetVolume) {
    const savedVol = localStorage.getItem('radioVolume') || '50';
    widgetVolume.value = savedVol;
    
    widgetVolume.addEventListener('input', (e) => {
      const vol = e.target.value;
      localStorage.setItem('radioVolume', vol);
      if (activeAudioElement) {
        activeAudioElement.volume = vol / 100;
      }
      const popupVolume = document.getElementById('popupVolumeSlider');
      if (popupVolume) popupVolume.value = vol;
    });
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
