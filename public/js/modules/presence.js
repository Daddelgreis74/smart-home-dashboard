import { Config } from './config.js';
import { getLangText, playPresencePing } from './utils.js';

export async function initPresence(socket) {
  const lang = Config.get('dashboard_lang', 'de');
  const addBtn = document.getElementById('addPresenceBtn');
  const fileInput = document.getElementById('presenceManAvatar');
  const fileNameSpan = document.getElementById('presenceManAvatarName');
  
  let uploadedAvatarUrl = '';
  let selectedAvatarUrl = '';
  let activeStates = {};

  // Toggle-Schalter für Benachrichtigungston initialisieren
  const presenceSoundToggle = document.getElementById('presenceSoundEnabled');
  if (presenceSoundToggle) {
    const isSoundEnabled = Config.get('presence_sound_enabled', true);
    presenceSoundToggle.checked = (isSoundEnabled === true || isSoundEnabled === 'true');
    presenceSoundToggle.addEventListener('change', (e) => {
      Config.set('presence_sound_enabled', e.target.checked);
    });
  }

  // Hilfsfunktion zur Erkennung von Zustandsübergängen (von offline zu online)
  function updatePresenceStatesAndPlay(persons) {
    const soundVal = Config.get('presence_sound_enabled', true);
    const soundEnabled = (soundVal === true || soundVal === 'true');

    persons.forEach(p => {
      const wasOffline = activeStates[p.id] === false;
      const isOnline = p.active === true;
      
      // Zustand im Tracker aktualisieren
      activeStates[p.id] = p.active;
      
      // Nur abspielen, wenn der vorherige Status offline (false) war und jetzt online (true) ist
      if (wasOffline && isOnline && soundEnabled) {
        playPresencePing();
      }
    });
  }

  // Avatar-Galerie Klick-Handler
  const selectables = document.querySelectorAll('.selectable-avatar-item');
  selectables.forEach(item => {
    item.addEventListener('click', () => {
      if (item.classList.contains('selected')) {
        item.classList.remove('selected');
        selectedAvatarUrl = '';
      } else {
        selectables.forEach(s => s.classList.remove('selected'));
        item.classList.add('selected');
        selectedAvatarUrl = item.getAttribute('data-avatar');
        
        // Hochgeladenes Bild zurücksetzen, da Galerie gewählt wurde
        if (fileInput) fileInput.value = '';
        if (fileNameSpan) {
          fileNameSpan.textContent = (window.translations && window.translations[lang]) ? window.translations[lang].presence_no_avatar : 'Kein Bild gewählt';
        }
        uploadedAvatarUrl = '';
      }
    });
  });

  // 1. Profilbild Upload Handler
  if(fileInput && fileNameSpan) {
    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if(!file) {
        fileNameSpan.textContent = (window.translations && window.translations[lang]) ? window.translations[lang].presence_no_avatar : 'Kein Bild gewählt';
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
          // Galerie-Auswahl aufheben, da eigenes Bild hochgeladen wurde
          selectables.forEach(s => s.classList.remove('selected'));
          selectedAvatarUrl = '';
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
            image: uploadedAvatarUrl || selectedAvatarUrl || '/sabine.png'
          })
        });
        const data = await res.json();
        if(data && data.success) {
          nameInput.value = '';
          macInput.value = '';
          if (fileInput) fileInput.value = '';
          if (fileNameSpan) {
            fileNameSpan.textContent = (window.translations && window.translations[lang]) ? window.translations[lang].presence_no_avatar : 'Kein Bild gewählt';
          }
          uploadedAvatarUrl = '';
          selectedAvatarUrl = '';
          selectables.forEach(s => s.classList.remove('selected'));
        } else {
          alert('Fehler beim Hinzufügen: ' + (data.error || 'Unbekannter Fehler'));
        }
      } catch(err) {
        console.error('Fehler beim Hinzufügen der Person:', err);
        alert('Fehler beim Hinzufügen der Person: ' + err.message);
      }
    });
  }

  // Socket.IO event handling
  socket.on('presence-list-updated', (persons) => {
    updatePresenceStatesAndPlay(persons);
    renderPresenceSettings(persons);
    renderPresenceWidget(persons);
  });

  socket.on('presence-updated', (persons) => {
    updatePresenceStatesAndPlay(persons);
    persons.forEach(p => {
      const card = document.getElementById(`usr-${p.id}`);
      if(card) {
        const ring = card.querySelector('.presence-avatar-ring');
        const badge = card.querySelector('.presence-status-badge');
        const status = card.querySelector('.presence-avatar-status');
        
        if(p.active) {
          card.classList.remove('inactive');
          card.classList.add('active');
          if (ring) ring.classList.add('active');
          if (badge) {
            badge.classList.add('active');
            badge.style.backgroundColor = 'var(--green)';
          }
          if (status) {
            status.textContent = getLangText('atHome');
            status.style.color = 'var(--green)';
          }
        } else {
          card.classList.remove('active');
          card.classList.add('inactive');
          if (ring) ring.classList.remove('active');
          if (badge) {
            badge.classList.remove('active');
            badge.style.backgroundColor = 'var(--text-muted)';
          }
          if (status) {
            status.textContent = getLangText('away');
            status.style.color = 'var(--text-muted)';
          }
        }
      }
    });
  });

  // Initial load
  try {
    const res = await fetch('/api/presence');
    const persons = await res.json();
    if(Array.isArray(persons)) {
      persons.forEach(p => {
        activeStates[p.id] = p.active;
      });
      renderPresenceSettings(persons);
      renderPresenceWidget(persons);
    }
  } catch(err) {
    console.error('Initial load of presence failed:', err);
  }
}

export function renderPresenceSettings(persons) {
  const lang = Config.get('dashboard_lang', 'de');
  const list = document.getElementById('presenceList');
  if(!list) return;
  list.innerHTML = '';

  if(persons.length === 0) {
    list.innerHTML = `<div style="font-size: 11px; color: var(--text-muted); text-align: center; padding: 10px;">${(window.translations && window.translations[lang]) ? window.translations[lang].presence_no_people || 'Keine Personen registriert.' : 'Keine Personen registriert.'}</div>`;
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

export async function removePerson(id) {
  if(!confirm(getLangText('deletePersonConfirm'))) return;
  try {
    const res = await fetch('/api/presence/' + id, { method: 'DELETE' });
    const data = await res.json();
    if(!data.success) {
      alert(getLangText('deletePersonError') + ' ' + (data.error || 'Error'));
    }
  } catch(err) {
    console.error('Delete person failed:', err);
  }
}

// Make globally accessible
window.removePerson = removePerson;

export function renderPresenceWidget(persons) {
  const lang = Config.get('dashboard_lang', 'de');
  const grid = document.getElementById('presenceAvatarsGrid');
  if(!grid) return;
  grid.innerHTML = '';

  if(persons.length === 0) {
    grid.innerHTML = `<div class="no-presence-devices">${(window.translations && window.translations[lang]) ? window.translations[lang].presence_no_people || 'Keine Personen registriert.' : 'Keine Personen registriert.'}</div>`;
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
