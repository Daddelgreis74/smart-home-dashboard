import { Config } from './config.js';
import { getLangText, playJarvisBeep } from './utils.js';
import { speakJarvisReply } from './jarvis.js';

export let appointmentsList = [];
export let checkedCalendarReminders = new Set();
export let disabledAppointmentReminders = new Set(JSON.parse(localStorage.getItem('disabled_reminders') || '[]'));

export function saveDisabledReminders() {
  localStorage.setItem('disabled_reminders', JSON.stringify([...disabledAppointmentReminders]));
}

export async function loadICS() {
  const lang = Config.get('dashboard_lang', 'de');
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
  const trans = window.translations || {};
  const todayText = trans[lang] ? trans[lang].today_waste_alert.replace(':', '') : 'Heute';
  const tomorrowText = trans[lang] ? trans[lang].tomorrow_waste_alert.replace(':', '') : 'Morgen';

  try {
    const r = await fetch('/api/appointments/ics-data'); // Endpunkt angepasst auf /api/appointments/ics-data
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

      const deduped = [];
      const seen = new Set();
      events.forEach(e => {
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
        list.innerHTML = (trans[lang] && trans[lang].waste_no_dates) ? `<p style="color:rgba(255,255,255,0.5);">${trans[lang].waste_no_dates}</p>` : '<p style="color:rgba(255,255,255,0.5);">Keine Termine.</p>'; 
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

export function initCalendar(socket) {
  const addEventBtn = document.getElementById('addEventBtn');
  const closeCalendarModal = document.getElementById('closeCalendarModal');
  const cancelApptBtn = document.getElementById('cancelApptBtn');
  const calendarAddForm = document.getElementById('calendarAddForm');
  const calendarAddModal = document.getElementById('calendarAddModal');

  if (addEventBtn) {
    addEventBtn.addEventListener('click', () => {
      const today = new Date().toISOString().split('T')[0];
      const dateInput = document.getElementById('apptDate');
      if (dateInput) dateInput.value = today;

      const titleInput = document.getElementById('apptTitle');
      const descInput = document.getElementById('apptDesc');
      const timeInput = document.getElementById('apptTime');
      const remindInput = document.getElementById('apptRemind');
      if (titleInput) titleInput.value = '';
      if (descInput) descInput.value = '';
      if (timeInput) timeInput.value = '12:00';
      if (remindInput) remindInput.checked = false;

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
      const remind = document.getElementById('apptRemind')?.checked || false;

      if (!title || !date || !time) return;

      try {
        const response = await fetch('/api/appointments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, date, time, description, remind })
        });
        const data = await response.json();
        if (data.success) {
          hideModal();
          fetchAppointments();
        } else {
          alert(data.error || "Fehler beim Speichern des Termins.");
        }
      } catch (err) {
        console.error("Error saving appointment:", err);
      }
    });
  }

  // Socket Listener für Echtzeit-Updates
  if (socket) {
    socket.on('appointments-updated', (appointments) => {
      appointmentsList = appointments;
      renderAppointments(appointments);
    });
  }

  // Sound & Loop Settings Felder initialisieren
  const reminderSoundSelector = document.getElementById('reminderSound');
  const reminderLoopSelector = document.getElementById('reminderLoop');
  const testSoundBtn = document.getElementById('testReminderSound');

  if (reminderSoundSelector) {
    reminderSoundSelector.value = Config.get('reminder_sound', 'sound-gong');
    reminderSoundSelector.addEventListener('change', async (e) => {
      await Config.set('reminder_sound', e.target.value);
    });
  }

  if (reminderLoopSelector) {
    reminderLoopSelector.value = Config.get('reminder_loop', 'loop-once');
    reminderLoopSelector.addEventListener('change', async (e) => {
      await Config.set('reminder_loop', e.target.value);
    });
  }

  if (testSoundBtn) {
    testSoundBtn.addEventListener('click', () => {
      const selectedSound = reminderSoundSelector ? reminderSoundSelector.value : 'sound-gong';
      playSound(selectedSound);
    });
  }

  // Initial laden
  fetchAppointments();

  // Erinnerungs-Check alle 30 Sekunden starten
  setInterval(checkCalendarReminders, 30000);
}

export async function fetchAppointments() {
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

export function renderAppointments(appointments) {
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

    const [, month, day] = appt.date.split('-');
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

export async function deleteAppointment(id) {
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

// Global verfügbar machen für inline onclick
window.deleteAppointment = deleteAppointment;

export let reminderInterval = null;

export function stopReminderSound() {
  if (reminderInterval) {
    clearInterval(reminderInterval);
    reminderInterval = null;
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

export function checkCalendarReminders() {
  const now = new Date();
  const todayStr = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + '-' + String(now.getDate()).padStart(2,'0');

  appointmentsList.forEach(appt => {
    if (!appt.remind || disabledAppointmentReminders.has(appt.id)) return;

    const apptDateTime = new Date(`${appt.date}T${appt.time}`);
    const offsets = [60, 45, 30, 15, 0];

    offsets.forEach(offset => {
      const triggerTime = new Date(apptDateTime.getTime() - offset * 60000);
      const diffMs = now - triggerTime;

      if (diffMs >= 0 && diffMs < 30000) {
        const key = `${appt.id}_${offset}`;
        if (!checkedCalendarReminders.has(key)) {
          checkedCalendarReminders.add(key);
          triggerCalendarReminder(appt, offset);
        }
      }
    });
  });
}

export function triggerCalendarReminder(appt, offset) {
  stopReminderSound();

  const soundType = Config.get('reminder_sound', 'sound-gong');
  const loopType = Config.get('reminder_loop', 'loop-once');

  playSound(soundType);

  if (loopType === 'loop-repeat') {
    reminderInterval = setInterval(() => {
      playSound(soundType);
    }, 5000);
  }

  const modal = document.getElementById('reminderModal');
  const countdownEl = document.getElementById('reminderModalCountdown');
  const titleEl = document.getElementById('reminderModalApptTitle');
  const descEl = document.getElementById('reminderModalDesc');
  const closeBtn = document.getElementById('reminderCloseBtn');
  const disableAllBtn = document.getElementById('reminderDisableAllBtn');

  if (!modal || !countdownEl || !titleEl || !descEl) return;

  if (offset === 0) {
    countdownEl.textContent = getLangText('reminder_now') || 'Findet jetzt statt:';
  } else {
    const textPattern = getLangText('reminder_in_minutes') || 'In {mins} Minuten:';
    countdownEl.textContent = textPattern.replace('{mins}', offset);
  }

  titleEl.textContent = appt.title;
  descEl.textContent = appt.description || '';

  const closeModal = () => {
    modal.setAttribute('hidden', '');
    stopReminderSound();
  };

  closeBtn.onclick = closeModal;

  disableAllBtn.onclick = () => {
    disabledAppointmentReminders.add(appt.id);
    saveDisabledReminders();
    closeModal();
  };

  modal.removeAttribute('hidden');
}
