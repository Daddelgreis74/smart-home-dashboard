import { Config } from './config.js';
import { getLangText } from './utils.js';

export async function initFritzbox(socket) {
  const lang = Config.get('dashboard_lang', 'de');
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
          const trans = window.translations || {};
          alert(trans[lang] && trans[lang].fritzbox_connect ? trans[lang].fritzbox_connect : 'Fritz!Box Connected!');
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
      const trans = window.translations || {};
      if(toastCaller) toastCaller.textContent = event.callerName || (trans[lang] ? trans[lang].toast_unknown_caller : 'Unbekannter Anrufer');
      overlay.removeAttribute('hidden');
    } else {
      overlay.setAttribute('hidden', '');
    }
  });
}
