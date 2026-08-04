import { Config } from './config.js';
import { getLangText, getTimestampedUrl } from './utils.js';

export let activeCameraIntervals = {};
export let currentCameras = [];
export let fullscreenInterval = null;

export async function initCameraWidget(socket) {
  const addBtn = document.getElementById('addCameraBtn');
  if(!addBtn) return;

  // Dynamic go2rtc web interface URL resolving to the current page host on port 1984
  const go2rtcLink = document.getElementById('go2rtcWebUiLink');
  if (go2rtcLink) {
    go2rtcLink.href = `http://${window.location.hostname}:1984`;
  }

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
        fsImg.src = '';
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
      
      const overlayEl = document.getElementById('cameraFullscreenOverlay');
      const fsImg = document.getElementById('fullscreenCameraImg');
      if (overlayEl && !overlayEl.hasAttribute('hidden') && fsImg) {
        const activeFullscreenCameraId = fsImg.dataset.cameraId;
        const activeCam = currentCameras.find(c => c.id === activeFullscreenCameraId);
        if (activeCam) {
          fsImg.src = getTimestampedUrl(`/api/cameras/stream/${activeCam.id}`);
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

export function renderCameraSettings(cameras) {
  const list = document.getElementById('cameraSettingsList');
  if(!list) return;
  list.innerHTML = '';

  if(cameras.length === 0) {
    const lang = Config.get('dashboard_lang', 'de');
    list.innerHTML = `<div style="font-size: 11px; color: var(--text-muted); text-align: center; padding: 10px;">${(window.translations && window.translations[lang]) ? window.translations[lang].camera_no_cameras || 'Keine Kameras registriert.' : 'Keine Kameras registriert.'}</div>`;
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

export async function removeCamera(id) {
  if(!confirm(getLangText('deleteCameraConfirm'))) return;
  try {
    const res = await fetch('/api/cameras/' + id, { method: 'DELETE' });
    const data = await res.json();
    if(!data.success) {
      alert(getLangText('deleteCameraError') + ' ' + (data.error || 'Error'));
    }
  } catch(err) {
    console.error('Delete camera failed:', err);
  }
}

// Make globally accessible
window.removeCamera = removeCamera;

export function renderCameraWidget(cameras) {
  const grid = document.getElementById('cameraGrid');
  if(!grid) return;

  Object.values(activeCameraIntervals).forEach(clearInterval);
  activeCameraIntervals = {};

  grid.className = 'camera-grid';
  grid.innerHTML = '';

  if(cameras.length === 0) {
    const lang = Config.get('dashboard_lang', 'de');
    grid.innerHTML = `<div class="no-cameras">${(window.translations && window.translations[lang]) ? window.translations[lang].camera_no_cameras || 'Keine Kameras eingerichtet.' : 'Keine Kameras eingerichtet.'}</div>`;
    return;
  }

  if(cameras.length === 1) grid.classList.add('cols-1');
  else if(cameras.length === 2) grid.classList.add('cols-2');
  else grid.classList.add('cols-4');

  cameras.forEach(c => {
    const card = document.createElement('div');
    card.className = 'camera-card';
    card.style.cssText = 'position: relative; border-radius: 12px; overflow: hidden; background: rgba(0,0,0,0.4); aspect-ratio: 16/9; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all var(--transition); border: 1px solid rgba(255,255,255,0.06);';    const img = document.createElement('img');
    img.className = 'camera-feed-img';
    img.style.cssText = 'width: 100%; height: 100%; object-fit: cover; transition: filter var(--transition);';
    img.alt = c.name;
    const streamProxyUrl = `/api/cameras/stream/${c.id}`;
    img.src = streamProxyUrl;

    const liveDot = document.createElement('div');
    liveDot.className = 'camera-live-dot';
    liveDot.style.cssText = 'position: absolute; top: 10px; right: 10px; display: flex; align-items: center; gap: 6px; padding: 4px 8px; background: rgba(0,0,0,0.6); border-radius: 20px; font-size: 8px; font-weight: 700; color: #fff; text-transform: uppercase; z-index: 2; border: 1px solid rgba(255,255,255,0.08);';
    liveDot.innerHTML = '<span class="led-dot red blinking"></span><span>Live</span>';

    const nameBadge = document.createElement('div');
    nameBadge.className = 'camera-name-badge';
    nameBadge.style.cssText = 'position: absolute; bottom: 8px; left: 8px; padding: 4px 8px; background: rgba(15, 18, 37, 0.75); backdrop-filter: blur(8px); border-radius: 6px; font-size: 10px; font-weight: 600; color: #fff; z-index: 2; border: 1px solid rgba(255,255,255,0.08);';
    nameBadge.textContent = c.name;

    card.append(img, liveDot, nameBadge);

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
        fsImg.src = getTimestampedUrl(streamProxyUrl);
        if(fsTitle) fsTitle.textContent = c.name;
        overlay.removeAttribute('hidden');

        const refreshMs = c.interval > 0 ? (c.interval * 1000) : (240 * 1000);
        fullscreenInterval = setInterval(() => {
          fsImg.src = getTimestampedUrl(streamProxyUrl);
        }, refreshMs);

        fsImg.onerror = () => {
          console.warn(`[Camera Fullscreen Error] Failed to load fullscreen for '${c.name}'.`);
          setTimeout(() => {
            if (!overlay.hasAttribute('hidden')) {
              fsImg.src = getTimestampedUrl(streamProxyUrl);
            }
          }, 3000);
        };
      }
    });

    img.onerror = () => {
      console.warn(`[Camera Error] Failed to load feed for '${c.name}'. Reconnecting...`);
      setTimeout(() => {
        if (img.isConnected) {
          img.src = getTimestampedUrl(streamProxyUrl);
        }
      }, 3000);
    };

    if(c.interval > 0) {
      const intervalMs = c.interval * 1000;
      activeCameraIntervals[c.id] = setInterval(() => {
        img.src = getTimestampedUrl(streamProxyUrl);
      }, intervalMs);
    } else {
      activeCameraIntervals[c.id] = setInterval(() => {
        console.log(`[Camera Watchdog] Periodic auto-refresh for live camera '${c.name}'`);
        img.src = getTimestampedUrl(streamProxyUrl);
      }, 270000);
    }

    grid.appendChild(card);
  });
}
