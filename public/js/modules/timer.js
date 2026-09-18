import { playSound } from './utils.js';

// Zentraler Timer-Zustand (Single Timer)
const timerState = {
  duration: 0,
  remaining: 0,
  interval: null,
  isPaused: false,
  alarmInterval: null,
  targetHH: 0,
  targetMM: 10,
  targetSS: 0
};

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

const ITEM_HEIGHT = 30; // Entspricht der CSS Zeilenhoehe

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
  setupScrollListener(drumHH, (val) => { timerState.targetHH = val; });
  setupScrollListener(drumMM, (val) => { timerState.targetMM = val; });
  setupScrollListener(drumSS, (val) => { timerState.targetSS = val; });

  // Event Listeners fuer Presets
  document.querySelectorAll('.timer-preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const seconds = parseInt(btn.getAttribute('data-time'), 10);
      if (!seconds || seconds <= 0) return;

      const hh = Math.floor(seconds / 3600);
      const mm = Math.floor((seconds % 3600) / 60);
      const ss = seconds % 60;
      
      setDrumValue(drumHH, hh, true);
      setDrumValue(drumMM, mm, true);
      setDrumValue(drumSS, ss, true);
      
      setTimeout(() => {
        startTimer(seconds);
      }, 500);
    });
  });

  // Event Listener fuer Start Button
  if (startBtn) {
    startBtn.addEventListener('click', () => {
      const totalSeconds = timerState.targetHH * 3600 + timerState.targetMM * 60 + timerState.targetSS;
      if (totalSeconds > 0) {
        startTimer(totalSeconds);
      }
    });
  }

  // Event Listener fuer Cancel Button
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      cancelTimer();
    });
  }

  // Event Listener fuer Pause/Resume Button
  if (pauseBtn) {
    pauseBtn.addEventListener('click', () => {
      if (timerState.alarmInterval) {
        cancelTimer();
        return;
      }
      if (timerState.isPaused) {
        resumeTimer();
      } else {
        pauseTimer();
      }
    });
  }

  // Socket Sync Event Listeners
  if (socket) {
    socket.on('timer-started', (data) => {
      syncStartTimer(data?.duration || 0, data?.remaining || 0, data?.isPaused || false);
    });
    socket.on('timer-paused', () => {
      syncPauseTimer();
    });
    socket.on('timer-resumed', () => {
      syncResumeTimer();
    });
    socket.on('timer-cancelled', () => {
      syncCancelTimer();
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

export function startTimer(seconds) {
  if (!seconds || seconds <= 0) return;

  stopAlarm();
  timerState.duration = seconds;
  timerState.remaining = seconds;
  timerState.isPaused = false;

  updateActiveUI();
  if (setupContainer) setupContainer.style.display = 'none';
  if (activeContainer) activeContainer.style.display = 'flex';
  updatePauseButtonUI();

  if (timerState.interval) clearInterval(timerState.interval);
  timerState.interval = setInterval(() => tick(), 1000);

  if (window.socket) {
    window.socket.emit('timer-start', {
      id: 1,
      duration: timerState.duration,
      remaining: timerState.remaining,
      isPaused: timerState.isPaused
    });
  }
}

function syncStartTimer(duration, remaining, paused) {
  if (!duration || duration <= 0) return;

  stopAlarm();
  timerState.duration = duration;
  timerState.remaining = remaining;
  timerState.isPaused = paused;

  if (timerState.interval) clearInterval(timerState.interval);
  if (!timerState.isPaused) {
    timerState.interval = setInterval(() => tick(), 1000);
  }

  updateActiveUI();
  if (setupContainer) setupContainer.style.display = 'none';
  if (activeContainer) {
    activeContainer.style.display = 'flex';
    if (timerState.remaining < 30) {
      activeContainer.classList.add('low-time');
    } else {
      activeContainer.classList.remove('low-time');
    }
  }
  updatePauseButtonUI();

  // Widget-Sichtbarkeit sicherstellen
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

function tick() {
  if (timerState.remaining <= 0) {
    triggerAlarm();
    return;
  }
  timerState.remaining--;

  updateActiveUI();
  if (!activeContainer) return;

  if (timerState.remaining < 30) {
    activeContainer.classList.add('low-time');
  } else {
    activeContainer.classList.remove('low-time');
  }
}

function updateActiveUI() {
  const hh = Math.floor(timerState.remaining / 3600);
  const mm = Math.floor((timerState.remaining % 3600) / 60);
  const ss = timerState.remaining % 60;

  let displayStr = "";
  if (hh > 0) {
    displayStr = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
  } else {
    displayStr = `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
  }

  if (countdownText) {
    countdownText.textContent = displayStr;
  }

  if (ringCircle && timerState.duration > 0) {
    const totalCircumference = 301.6; // 2 * Math.PI * 48
    const progress = timerState.remaining / timerState.duration;
    const offset = totalCircumference * (1 - progress);
    ringCircle.setAttribute('stroke-dashoffset', offset.toFixed(1));
  }
}

function updatePauseButtonUI() {
  if (!pauseBtn) return;

  if (timerState.alarmInterval) {
    pauseBtn.innerHTML = `<i class="fas fa-stop-circle"></i> <span data-i18n="timer_btn_stop">Stop</span>`;
    pauseBtn.style.background = '#ef4444';
    pauseBtn.style.color = '#fff';
  } else if (timerState.isPaused) {
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
  if (timerState.isPaused) return;

  if (timerState.interval) {
    clearInterval(timerState.interval);
    timerState.interval = null;
  }
  timerState.isPaused = true;

  updatePauseButtonUI();

  if (window.socket) {
    window.socket.emit('timer-pause', { id: 1 });
  }
}

function syncPauseTimer() {
  if (timerState.interval) {
    clearInterval(timerState.interval);
    timerState.interval = null;
  }
  timerState.isPaused = true;
  updatePauseButtonUI();
}

export function resumeTimer() {
  if (!timerState.isPaused || timerState.remaining <= 0) return;

  timerState.isPaused = false;
  updatePauseButtonUI();

  if (timerState.interval) clearInterval(timerState.interval);
  timerState.interval = setInterval(() => tick(), 1000);

  if (window.socket) {
    window.socket.emit('timer-resume', { id: 1 });
  }
}

function syncResumeTimer() {
  timerState.isPaused = false;
  updatePauseButtonUI();

  if (timerState.interval) clearInterval(timerState.interval);
  timerState.interval = setInterval(() => tick(), 1000);
}

export function cancelTimer() {
  stopAlarm();

  if (timerState.interval) {
    clearInterval(timerState.interval);
    timerState.interval = null;
  }
  timerState.duration = 0;
  timerState.remaining = 0;
  timerState.isPaused = false;

  if (activeContainer) {
    activeContainer.classList.remove('low-time');
    activeContainer.style.display = 'none';
  }
  if (setupContainer) {
    setupContainer.style.display = 'flex';
  }
  updatePauseButtonUI();

  // Räder zurückstellen
  if (drumHH && drumMM && drumSS) {
    setDrumValue(drumHH, timerState.targetHH, false);
    setDrumValue(drumMM, timerState.targetMM, false);
    setDrumValue(drumSS, timerState.targetSS, false);
  }

  if (window.socket) {
    window.socket.emit('timer-cancel', { id: 1 });
  }
}

function syncCancelTimer() {
  stopAlarm();

  if (timerState.interval) {
    clearInterval(timerState.interval);
    timerState.interval = null;
  }
  timerState.duration = 0;
  timerState.remaining = 0;
  timerState.isPaused = false;

  if (activeContainer) {
    activeContainer.classList.remove('low-time');
    activeContainer.style.display = 'none';
  }
  if (setupContainer) {
    setupContainer.style.display = 'flex';
  }
  updatePauseButtonUI();

  if (drumHH && drumMM && drumSS) {
    setDrumValue(drumHH, timerState.targetHH, false);
    setDrumValue(drumMM, timerState.targetMM, false);
    setDrumValue(drumSS, timerState.targetSS, false);
  }
}

function triggerAlarm() {
  if (timerState.interval) {
    clearInterval(timerState.interval);
    timerState.interval = null;
  }

  if (countdownText) {
    countdownText.textContent = "ALARM!";
  }
  if (activeContainer) {
    activeContainer.classList.add('low-time');
  }
  updatePauseButtonUI();

  const soundType = localStorage.getItem('timer_alarm_sound') || 'sound-gong';
  playSound(soundType);

  if (timerState.alarmInterval) clearInterval(timerState.alarmInterval);
  timerState.alarmInterval = setInterval(() => {
    playSound(soundType);
  }, 2500);
}

function stopAlarm() {
  if (timerState.alarmInterval) {
    clearInterval(timerState.alarmInterval);
    timerState.alarmInterval = null;
  }
}

export function getTimerStatus() {
  return {
    active: timerState.interval !== null || timerState.alarmInterval !== null,
    remaining: timerState.remaining,
    duration: timerState.duration,
    isPaused: timerState.isPaused,
    isAlarm: timerState.alarmInterval !== null
  };
}
