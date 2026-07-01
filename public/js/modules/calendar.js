import { Config } from './config.js';
import { getLangText, playJarvisBeep } from './utils.js';
import { speakJarvisReply } from './jarvis.js';

export let appointmentsList = [];
export let checkedCalendarReminders = new Set();

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

export function initCalendar() {
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
        console.error("Error saving appointment:", err);
      }
    });
  }
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

export function checkCalendarReminders() {
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

export function triggerCalendarReminder(appt) {
  showReminderToast(appt);

  playJarvisBeep(660, 0.15, 0.2);
  setTimeout(() => playJarvisBeep(660, 0.15, 0.2), 250);

  const lang = Config.get('dashboard_lang', 'de');
  let speakText = `Sir, ich erinnere Sie an Ihren Termin: ${appt.title}`;
  if (appt.description) speakText += `. Details: ${appt.description}`;
  if (lang !== 'de') {
    speakText = `Sir, reminding you of your appointment: ${appt.title}`;
    if (appt.description) speakText += `. Details: ${appt.description}`;
  }

  const ttsEnabled = Config.get('jarvis_tts_enabled', 'true') !== 'false';
  if (ttsEnabled) {
    speakJarvisReply(speakText);
  }
}

export function showReminderToast(appt) {
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

  setTimeout(() => toast.classList.add('show'), 100);

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  }, 10000);
}
