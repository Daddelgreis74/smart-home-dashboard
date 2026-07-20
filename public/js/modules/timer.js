import { playSound } from './utils.js';

// Dictionary zur Verwaltung beider Timer
let timers = {
  1: { duration: 0, remaining: 0, interval: null, isPaused: false, alarmInterval: null, targetHH: 0, targetMM: 10, targetSS: 0 },
  2: { duration: 0, remaining: 0, interval: null, isPaused: false, alarmInterval: null, targetHH: 0, targetMM: 10, targetSS: 0 }
};

let currentTimerId = 1; // Aktuell sichtbarer Timer-Tab

// Hilfsvariablen für die aktuelle Auswahl im Wähler (Trommel)
let targetHH = 0;
let targetMM = 10;
let targetSS = 0;

// DOM Elemente
let setupContainer = null;
let activeContainer = null;
let ringCircle = null;
let countdownText = null;
let startBtn = null;
let cancelBtn = null;
let pauseBtn = null;

// Drum Elements
let drumHH = null;
let drumMM = null;
let drumSS = null;

const ITEM_HEIGHT = 30; // Entspricht der CSS Zeilenhöhe

export function initTimer(socket) {
  setupContainer = document.querySelector('.timer-setup-container');
  activeContainer = document.querySelector('.timer-active-container');
  ringCircle = document.getElementById('timerRingCircle');
  countdownText = document.getElementById('timerCountdownText');
  startBtn = document.getElementById('timerStartBtn');
  cancelBtn = document.getElementById('timerCancelBtn');
  pauseBtn = document.getElementById('timerPauseBtn');

  drumHH = document.getElementById('timerDrumHH');
  drumMM = document.getElementById('timerDrumMM');
  drumSS = document.getElementById('timerDrumSS');

  if (!setupContainer || !activeContainer || !drumHH || !drumMM || !drumSS) return;

  // Initialize drums
  populateDrum(drumHH, 24);
  populateDrum(drumMM, 60);
  populateDrum(drumSS, 60);

  // Set default values (0 hours, 10 minutes, 0 seconds)
  setTimeout(() => {
    setDrumValue(drumHH, 0, false);
    setDrumValue(drumMM, 10, false);
    setDrumValue(drumSS, 0, false);
  }, 100);

  // Event Listeners for scroll logic
  setupScrollListener(drumHH, (val) => { targetHH = val; });
  setupScrollListener(drumMM, (val) => { targetMM = val; });
  setupScrollListener(drumSS, (val) => { targetSS = val; });

  // Event Listeners für Presets
  document.querySelectorAll('.timer-preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const seconds = parseInt(btn.getAttribute('data-time'), 10);
      if (seconds > 0) {
        // Räder flüssig einstellen und danach starten
        const hh = Math.floor(seconds / 3600);
        const mm = Math.floor((seconds % 3600) / 60);
        const ss = seconds % 60;
        
        setDrumValue(drumHH, hh, true);
        setDrumValue(drumMM, mm, true);
        setDrumValue(drumSS, ss, true);
        
        setTimeout(() => {
          startTimer(seconds);
        }, 500); // 500ms Verzögerung für die Animation
      }
    });
  });

  // Event Listener für Start Button
  if (startBtn) {
    startBtn.addEventListener('click', () => {
      const totalSeconds = targetHH * 3600 + targetMM * 60 + targetSS;
      if (totalSeconds > 0) {
        startTimer(totalSeconds);
      }
    });
  }

  // Event Listener für Cancel Button
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      cancelTimer();
    });
  }

  // Event Listener für Pause Button
  if (pauseBtn) {
    pauseBtn.addEventListener('click', () => {
      const t = timers[currentTimerId];
      if (t.alarmInterval) {
        cancelTimer();
        return;
      }
      if (t.isPaused) {
        resumeTimer();
      } else {
        pauseTimer();
      }
    });
  }

  // Event Listeners für Tab-Umschaltung
  document.querySelectorAll('.timer-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const id = parseInt(tab.getAttribute('data-timer-id'), 10);
      switchTimerTab(id);
    });
  });

  // Socket Sync Event Listeners
  if (socket) {
    socket.on('timer-started', (data) => {
      syncStartTimer(data.id || 1, data.duration, data.remaining, data.isPaused);
    });
    socket.on('timer-paused', (data) => {
      syncPauseTimer(data.id || 1);
    });
    socket.on('timer-resumed', (data) => {
      syncResumeTimer(data.id || 1);
    });
    socket.on('timer-cancelled', (data) => {
      syncCancelTimer(data.id || 1);
    });
  }
}

function populateDrum(container, count) {
  container.innerHTML = "";
  
  // Top spacer
  const topSpacer = document.createElement('div');
  topSpacer.className = 'timer-drum-spacer';
  container.appendChild(topSpacer);

  // Numeric items
  for (let i = 0; i < count; i++) {
    const item = document.createElement('div');
    item.className = 'timer-drum-item';
    item.textContent = String(i).padStart(2, '0');
    container.appendChild(item);
  }

  // Bottom spacer
  const bottomSpacer = document.createElement('div');
  bottomSpacer.className = 'timer-drum-spacer';
  container.appendChild(bottomSpacer);
}

function setupScrollListener(container, onSelect) {
  const handleScroll = () => {
    const scrollTop = container.scrollTop;
    const viewHeight = container.clientHeight;
    const center = scrollTop + viewHeight / 2;

    const items = container.querySelectorAll('.timer-drum-item');
    let closestItem = null;
    let minDiff = Infinity;

    items.forEach((item, index) => {
      const itemTop = (index * ITEM_HEIGHT) + ITEM_HEIGHT; // Offset by spacer
      const itemCenter = itemTop + ITEM_HEIGHT / 2;
      const diff = Math.abs(center - itemCenter);

      const relativeDist = (itemCenter - center) / viewHeight; // -0.5 to 0.5
      const angle = relativeDist * 60; // Max 30 deg tilt
      const scale = 1 - Math.abs(relativeDist) * 0.4;
      const z = -Math.abs(relativeDist) * 35;
      const opacity = 1 - Math.abs(relativeDist) * 0.75;

      item.style.transform = `rotateX(${angle}deg) translateZ(${z}px) scale(${scale})`;
      item.style.opacity = opacity;

      if (diff < minDiff) {
        minDiff = diff;
        closestItem = item;
      }
    });

    if (closestItem) {
      items.forEach(it => it.classList.remove('active'));
      closestItem.classList.add('active');
      const val = parseInt(closestItem.textContent, 10);
      onSelect(val);
    }
  };

  container.addEventListener('scroll', handleScroll);
  setTimeout(handleScroll, 150);
}

function setDrumValue(container, value, smooth = true) {
  const targetScrollTop = value * ITEM_HEIGHT;
  container.scrollTo({
    top: targetScrollTop,
    behavior: smooth ? 'smooth' : 'auto'
  });
}

function switchTimerTab(newId) {
  if (newId === currentTimerId) return;

  // 1. Sichere aktuelle Wähler-Werte des alten Timers
  timers[currentTimerId].targetHH = targetHH;
  timers[currentTimerId].targetMM = targetMM;
  timers[currentTimerId].targetSS = targetSS;

  // Tab Header umschalten
  document.querySelectorAll('.timer-tab').forEach(tab => {
    const tabId = parseInt(tab.getAttribute('data-timer-id'), 10);
    if (tabId === newId) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });

  // 2. Lade Werte des neuen Timers
  currentTimerId = newId;
  const t = timers[currentTimerId];
  targetHH = t.targetHH;
  targetMM = t.targetMM;
  targetSS = t.targetSS;

  // Räder positionieren
  if (drumHH && drumMM && drumSS) {
    setDrumValue(drumHH, targetHH, false);
    setDrumValue(drumMM, targetMM, false);
    setDrumValue(drumSS, targetSS, false);
  }

  // 3. Sichtbarkeit anpassen
  if (t.duration > 0 || t.alarmInterval !== null) {
    setupContainer.style.display = 'none';
    activeContainer.style.display = 'flex';
    updateActiveUI();
    updatePauseButtonUI();
    
    if (t.remaining < 30) {
      activeContainer.classList.add('low-time');
    } else {
      activeContainer.classList.remove('low-time');
    }
  } else {
    setupContainer.style.display = 'flex';
    activeContainer.style.display = 'none';
    activeContainer.classList.remove('low-time');
  }
}

export function startTimer(seconds) {
  const id = currentTimerId;
  const t = timers[id];
  stopAlarm(id);
  t.duration = seconds;
  t.remaining = seconds;
  t.isPaused = false;

  if (id === currentTimerId) {
    updateActiveUI();
    setupContainer.style.display = 'none';
    activeContainer.style.display = 'flex';
    updatePauseButtonUI();
  }

  if (t.interval) clearInterval(t.interval);
  t.interval = setInterval(() => tick(id), 1000);

  updateTabIndicators();

  if (window.socket) {
    window.socket.emit('timer-start', {
      id: id,
      duration: t.duration,
      remaining: t.remaining,
      isPaused: t.isPaused
    });
  }
}

function syncStartTimer(id, duration, remaining, paused) {
  const t = timers[id];
  stopAlarm(id);
  t.duration = duration;
  t.remaining = remaining;
  t.isPaused = paused;

  if (t.interval) clearInterval(t.interval);
  if (!t.isPaused) {
    t.interval = setInterval(() => tick(id), 1000);
  }

  if (id === currentTimerId) {
    updateActiveUI();
    setupContainer.style.display = 'none';
    activeContainer.style.display = 'flex';
    updatePauseButtonUI();
    
    if (t.remaining < 30) {
      activeContainer.classList.add('low-time');
    } else {
      activeContainer.classList.remove('low-time');
    }
  }

  updateTabIndicators();

  // Widget-Sichtbarkeit erzwingen
  const widget = document.querySelector('.widget[data-type="timer"]');
  if (widget) {
    widget.classList.remove('hidden');
    widget.style.display = '';
  }
  const toggle = document.getElementById('toggle-timer');
  if (toggle) {
    toggle.checked = true;
  }
  const tabBtn = document.querySelector('.settings-tab-btn[data-tab="timer"]');
  if (tabBtn) {
    tabBtn.style.display = '';
  }
  localStorage.setItem('show_timer', 'true');
}

function tick(id) {
  const t = timers[id];
  if (t.remaining <= 0) {
    triggerAlarm(id);
    return;
  }
  t.remaining--;

  if (id === currentTimerId) {
    updateActiveUI();
    if (t.remaining < 30) {
      activeContainer.classList.add('low-time');
    } else {
      activeContainer.classList.remove('low-time');
    }
  }
}

function updateActiveUI() {
  const t = timers[currentTimerId];
  const hh = Math.floor(t.remaining / 3600);
  const mm = Math.floor((t.remaining % 3600) / 60);
  const ss = t.remaining % 60;

  let displayStr = "";
  if (hh > 0) {
    displayStr = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
  } else {
    displayStr = `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
  }

  if (countdownText) {
    countdownText.textContent = displayStr;
  }

  if (ringCircle && t.duration > 0) {
    const totalCircumference = 301.6; // 2 * Math.PI * 48
    const progress = t.remaining / t.duration;
    const offset = totalCircumference * (1 - progress);
    ringCircle.setAttribute('stroke-dashoffset', offset.toFixed(1));
  }
}

function updatePauseButtonUI() {
  const t = timers[currentTimerId];
  if (!pauseBtn) return;

  if (t.alarmInterval) {
    pauseBtn.innerHTML = `<i class="fas fa-stop-circle"></i> <span data-i18n="timer_btn_stop">Stop</span>`;
    pauseBtn.style.background = '#ef4444';
    pauseBtn.style.color = '#fff';
  } else if (t.isPaused) {
    pauseBtn.innerHTML = `<i class="fas fa-play"></i> <span data-i18n="timer_btn_resume">Fortsetzen</span>`;
    pauseBtn.style.background = '#4fd8ff';
    pauseBtn.style.color = '#000';
  } else {
    pauseBtn.innerHTML = `<i class="fas fa-pause"></i> <span data-i18n="timer_btn_pause">Pause</span>`;
    pauseBtn.style.background = 'var(--primary)';
    pauseBtn.style.color = '#000';
  }
}

export function pauseTimer() {
  const id = currentTimerId;
  const t = timers[id];
  if (t.interval) {
    clearInterval(t.interval);
    t.interval = null;
  }
  t.isPaused = true;

  if (id === currentTimerId) {
    updatePauseButtonUI();
  }

  if (window.socket) {
    window.socket.emit('timer-pause', { id });
  }
}

function syncPauseTimer(id) {
  const t = timers[id];
  if (t.interval) {
    clearInterval(t.interval);
    t.interval = null;
  }
  t.isPaused = true;

  if (id === currentTimerId) {
    updatePauseButtonUI();
  }
}

export function resumeTimer() {
  const id = currentTimerId;
  const t = timers[id];
  t.isPaused = false;

  if (id === currentTimerId) {
    updatePauseButtonUI();
  }

  if (t.interval) clearInterval(t.interval);
  t.interval = setInterval(() => tick(id), 1000);

  if (window.socket) {
    window.socket.emit('timer-resume', { id });
  }
}

function syncResumeTimer(id) {
  const t = timers[id];
  t.isPaused = false;

  if (id === currentTimerId) {
    updatePauseButtonUI();
  }

  if (t.interval) clearInterval(t.interval);
  t.interval = setInterval(() => tick(id), 1000);
}

export function cancelTimer() {
  const id = currentTimerId;
  const t = timers[id];
  stopAlarm(id);

  if (t.interval) {
    clearInterval(t.interval);
    t.interval = null;
  }
  t.duration = 0;
  t.remaining = 0;
  t.isPaused = false;

  if (id === currentTimerId) {
    activeContainer.classList.remove('low-time');
    setupContainer.style.display = 'flex';
    activeContainer.style.display = 'none';
    updatePauseButtonUI();

    // Räder zurückstellen
    if (drumHH && drumMM && drumSS) {
      setDrumValue(drumHH, targetHH, false);
      setDrumValue(drumMM, targetMM, false);
      setDrumValue(drumSS, targetSS, false);
    }
  }

  updateTabIndicators();

  if (window.socket) {
    window.socket.emit('timer-cancel', { id });
  }
}

function syncCancelTimer(id) {
  const t = timers[id];
  stopAlarm(id);

  if (t.interval) {
    clearInterval(t.interval);
    t.interval = null;
  }
  t.duration = 0;
  t.remaining = 0;
  t.isPaused = false;

  if (id === currentTimerId) {
    activeContainer.classList.remove('low-time');
    setupContainer.style.display = 'flex';
    activeContainer.style.display = 'none';
    updatePauseButtonUI();

    if (drumHH && drumMM && drumSS) {
      setDrumValue(drumHH, targetHH, false);
      setDrumValue(drumMM, targetMM, false);
      setDrumValue(drumSS, targetSS, false);
    }
  }

  updateTabIndicators();
}

function triggerAlarm(id) {
  const t = timers[id];
  if (t.interval) {
    clearInterval(t.interval);
    t.interval = null;
  }

  // Bei Alarm automatisch auf den ablaufenden Timer umschalten!
  if (id !== currentTimerId) {
    switchTimerTab(id);
  }

  if (countdownText) {
    countdownText.textContent = "ALARM!";
  }
  activeContainer.classList.add('low-time');
  updatePauseButtonUI();

  const soundType = localStorage.getItem('timer_alarm_sound') || 'sound-gong';
  playSound(soundType);

  if (t.alarmInterval) clearInterval(t.alarmInterval);
  t.alarmInterval = setInterval(() => {
    playSound(soundType);
  }, 2500);
}

function stopAlarm(id) {
  const t = timers[id];
  if (t.alarmInterval) {
    clearInterval(t.alarmInterval);
    t.alarmInterval = null;
  }
}

function updateTabIndicators() {
  [1, 2].forEach(id => {
    const t = timers[id];
    const dot = document.getElementById(`timerTabIndicator${id}`);
    if (dot) {
      if (t.duration > 0 || t.alarmInterval !== null) {
        dot.style.display = 'inline-block';
      } else {
        dot.style.display = 'none';
      }
    }
  });
}

export function getTimerStatus() {
  const t = timers[currentTimerId];
  return {
    active: t.interval !== null || t.alarmInterval !== null,
    remaining: t.remaining,
    duration: t.duration,
    isPaused: t.isPaused,
    isAlarm: t.alarmInterval !== null
  };
}
