import { Config } from './config.js';
import { getLangText } from './utils.js';

export async function initFritzbox(socket) {
  const lang = Config.get('dashboard_lang', 'de');

  // Helper to update Guest WiFi UI state
  function updateGuestWifiUI(gw) {
    const toggle = document.getElementById('toggleFritzGuest');
    const ssidEl = document.getElementById('valFritzGuestSsid');
    const qrBtn = document.getElementById('btnFritzGuestQr');
    const icon = document.getElementById('iconFritzGuest');

    if (!gw) return;

    if (toggle) toggle.checked = !!gw.enabled;
    if (ssidEl) {
      ssidEl.textContent = gw.enabled ? (gw.ssid || 'Aktiv') : 'Inaktiv';
      ssidEl.style.color = gw.enabled ? 'var(--primary)' : 'var(--text-muted)';
    }
    if (qrBtn) {
      qrBtn.style.display = gw.enabled ? 'inline-block' : 'none';
    }
    if (icon) {
      if (gw.enabled) icon.classList.add('active');
      else icon.classList.remove('active');
    }
  }

  // Helper to update Fritz!Box Model and Sync Info
  function updateFritzInfo(data) {
    if (!data) return;
    if (data.modelName) {
      const headerModel = document.getElementById('fritzHeaderModel');
      if (headerModel) headerModel.textContent = data.modelName;
    }
    if (data.maxDown) {
      window.fritzSyncDownBits = data.maxDown;
      const syncDownEl = document.getElementById('valFritzSyncDown');
      if (syncDownEl) syncDownEl.textContent = `Sync: ${(data.maxDown / 1000000).toFixed(0)}M`;
    }
    if (data.maxUp) {
      window.fritzSyncUpBits = data.maxUp;
      const syncUpEl = document.getElementById('valFritzSyncUp');
      if (syncUpEl) syncUpEl.textContent = `Sync: ${(data.maxUp / 1000000).toFixed(0)}M`;
    }
    if (data.guestWifi) {
      updateGuestWifiUI(data.guestWifi);
    }
  }

  // Load saved Fritz!Box configuration & initial router info
  try {
    const res = await fetch('/api/fritzbox/config');
    const cfg = await res.json();
    if (cfg && cfg.success) {
      if (document.getElementById('fritzIp')) document.getElementById('fritzIp').value = cfg.ip || '192.168.178.1';
      if (document.getElementById('fritzUser')) document.getElementById('fritzUser').value = cfg.user || '';
      if (document.getElementById('toggleFritzCallMonitor')) document.getElementById('toggleFritzCallMonitor').checked = cfg.callMonitorEnabled !== false;
    }
  } catch (e) {}

  try {
    const stRes = await fetch('/api/fritzbox/status');
    const stData = await stRes.json();
    if (stData && stData.success) {
      updateFritzInfo(stData);
    }
  } catch (e) {}

  // Save configuration event listener in settings tab
  const saveBtn = document.getElementById('saveFritzConfig');
  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      const ip = document.getElementById('fritzIp').value.trim();
      const user = document.getElementById('fritzUser').value.trim();
      const pass = document.getElementById('fritzPassword').value;
      const callMonitorEnabled = document.getElementById('toggleFritzCallMonitor').checked;
      
      if (!ip) {
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
        if (data && data.success) {
          const trans = window.translations || {};
          alert(trans[lang] && trans[lang].fritzbox_connect ? trans[lang].fritzbox_connect : 'Fritz!Box Connected!');
          if (document.getElementById('fritzPassword')) document.getElementById('fritzPassword').value = '';
          const freshRes = await fetch('/api/fritzbox/status');
          const freshData = await freshRes.json();
          if (freshData && freshData.success) updateFritzInfo(freshData);
        } else {
          alert('Error: ' + (data.error || 'Unknown Error'));
        }
      } catch (err) {
        alert('Verbindungsfehler: ' + err.message);
      } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = oldText;
      }
    });
  }

  // Guest WiFi Toggle Handler
  const toggleGuest = document.getElementById('toggleFritzGuest');
  if (toggleGuest) {
    toggleGuest.addEventListener('change', async (e) => {
      const enabled = e.target.checked;
      toggleGuest.disabled = true;
      try {
        const res = await fetch('/api/fritzbox/guest-wifi', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ enabled })
        });
        const d = await res.json();
        if (d && d.success) {
          updateGuestWifiUI(d);
        } else {
          toggleGuest.checked = !enabled;
          alert('Gast-WLAN Fehler: ' + (d.error || 'Unbekannt'));
        }
      } catch (err) {
        toggleGuest.checked = !enabled;
        alert('Verbindungsfehler: ' + err.message);
      } finally {
        toggleGuest.disabled = false;
      }
    });
  }

  // Guest WiFi QR Code Modal Handler
  const btnQr = document.getElementById('btnFritzGuestQr');
  const modalQr = document.getElementById('fritzGuestQrModal');
  const closeQr = document.getElementById('closeGuestQrModal');

  if (btnQr && modalQr) {
    btnQr.addEventListener('click', async () => {
      const container = document.getElementById('fritzQrCodeContainer');
      const ssidEl = document.getElementById('modalGuestSsid');
      const keyEl = document.getElementById('modalGuestKey');
      if (container) container.innerHTML = '<div style="padding: 30px; color: #64748b;"><i class="fas fa-spinner fa-spin"></i> Lade QR-Code...</div>';
      modalQr.removeAttribute('hidden');

      try {
        const res = await fetch('/api/fritzbox/guest-wifi/qr');
        const data = await res.json();
        if (data && data.success && data.svg) {
          if (container) container.innerHTML = data.svg;
          if (ssidEl) ssidEl.textContent = data.ssid || '--';
          if (keyEl) keyEl.textContent = data.key || '(Kein Passwort)';
        } else {
          if (container) container.innerHTML = `<div style="color: #ef4444; padding: 20px;">${data.error || 'Fehler beim Laden'}</div>`;
        }
      } catch (err) {
        if (container) container.innerHTML = `<div style="color: #ef4444; padding: 20px;">${err.message}</div>`;
      }
    });

    if (closeQr) {
      closeQr.addEventListener('click', () => {
        modalQr.setAttribute('hidden', '');
      });
    }

    modalQr.addEventListener('click', (e) => {
      if (e.target === modalQr) {
        modalQr.setAttribute('hidden', '');
      }
    });
  }

  // Socket.IO real-time handlers
  
  // 1. Network & Router Status updates
  socket.on('fritz-status', (status) => {
    updateFritzInfo(status);

    const ledFritz = document.getElementById('ledFritz');
    const valFritzStatus = document.getElementById('valFritzStatus');
    const ledInternet = document.getElementById('ledInternet');
    const valInternetStatus = document.getElementById('valInternetStatus');

    if (ledFritz && valFritzStatus) {
      if (status.fritzOnline) {
        ledFritz.className = 'led-dot green';
        valFritzStatus.textContent = `Online (${status.fritzLatency}ms)`;
      } else {
        ledFritz.className = 'led-dot red';
        valFritzStatus.textContent = getLangText('offline');
      }
    }

    const settingsLedFritz = document.getElementById('settingsLedFritz');
    if (settingsLedFritz) {
      settingsLedFritz.className = status.fritzOnline ? 'led-dot green' : 'led-dot red';
    }

    if (ledInternet && valInternetStatus) {
      if (status.internetOnline) {
        ledInternet.className = 'led-dot green';
        valInternetStatus.textContent = `Internet (${status.internetLatency}ms)`;
      } else {
        ledInternet.className = 'led-dot red';
        valInternetStatus.textContent = getLangText('offline');
      }
    }
  });

  // 1b. Real-time Guest WiFi updates
  socket.on('fritz-guest-wifi', (gw) => {
    updateGuestWifiUI(gw);
  });

  // 2. Call log updates
  socket.on('fritz-calls', (calls) => {
    const list = document.getElementById('fritzCallList');
    const countBadge = document.getElementById('fritzCallCount');
    if (!list) return;

    if (countBadge) {
      countBadge.textContent = Array.isArray(calls) ? calls.length : 0;
    }

    if (!calls || calls.length === 0) {
      const trans = window.translations || {};
      list.innerHTML = `<div class="no-calls" data-i18n="fritzbox_no_calls">${trans[lang] ? trans[lang].fritzbox_no_calls : 'Keine Anrufe protokolliert.'}</div>`;
      return;
    }

    list.innerHTML = '';
    calls.forEach(call => {
      const item = document.createElement('div');
      item.className = 'fritz-call-item';
      
      let iconClass = 'fa-phone';
      let iconStyleClass = 'inbound';

      if (call.type === 'RING') {
        iconClass = 'fa-phone-volume';
        iconStyleClass = 'inbound';
      } else if (call.type === 'CALL') {
        iconClass = 'fa-phone-flip';
        iconStyleClass = 'outbound';
      } else if (call.type === 'MISSED') {
        iconClass = 'fa-phone-slash';
        iconStyleClass = 'missed';
      } else if (call.type === 'CONNECTED') {
        iconClass = 'fa-phone-square';
        iconStyleClass = 'connected';
      }

      // Format Duration
      let durText = '';
      let durClass = 'call-duration';
      if (call.duration > 0) {
        const m = Math.floor(call.duration / 60);
        const s = call.duration % 60;
        durText = m > 0 ? `${m}m ${s}s` : `${s}s`;
      } else if (call.type === 'MISSED') {
        durText = getLangText('missed');
        durClass += ' missed-badge';
      } else if (call.type === 'RING') {
        durText = getLangText('ringing');
      } else {
        durText = getLangText('noConnection');
      }

      const uhrText = lang === 'de' ? ' Uhr' : '';
      const displayName = call.callerName || call.number || 'Unbekannt';
      const subInfo = call.number && call.number !== displayName ? `${call.number} • ` : '';

      item.innerHTML = `
        <div class="call-info-left">
          <div class="call-icon ${iconStyleClass}"><i class="fas ${iconClass}"></i></div>
          <div class="call-details">
            <span class="call-name" title="${displayName}">${displayName}</span>
            <span class="call-time">${subInfo}${call.time}${uhrText}</span>
          </div>
        </div>
        <span class="${durClass}">${durText}</span>
      `;
      list.appendChild(item);
    });
  });

  // 3. Live call ring overlay
  socket.on('fritz-ringing', (event) => {
    const overlay = document.getElementById('fritzToastOverlay');
    const toastNumber = document.getElementById('fritzToastNumber');
    const toastCaller = document.getElementById('fritzToastCaller');

    if (!overlay) return;

    if (event.active) {
      if (toastNumber) toastNumber.textContent = event.number;
      const trans = window.translations || {};
      if (toastCaller) toastCaller.textContent = event.callerName || (trans[lang] ? trans[lang].toast_unknown_caller : 'Unbekannter Anrufer');
      overlay.removeAttribute('hidden');
    } else {
      overlay.setAttribute('hidden', '');
    }
  });
}
