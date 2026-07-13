import { playSound } from './utils.js';

let timerDuration = 0; // Gesamtzeit in Sekunden
let timerRemaining = 0; // Verbleibende Sekunden
let timerInterval = null;
let isPaused = false;

let alarmInterval = null;

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

// Target values
let targetHH = 0;
let targetMM = 10;
let targetSS = 0;

const ITEM_HEIGHT = 30; // Matches CSS line-height

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
        // Smoothly scroll the wheels first, then start
        const hh = Math.floor(seconds / 3600);
        const mm = Math.floor((seconds % 3600) / 60);
        const ss = seconds % 60;
        
        setDrumValue(drumHH, hh, true);
        setDrumValue(drumMM, mm, true);
        setDrumValue(drumSS, ss, true);
        
        setTimeout(() => {
          startTimer(seconds);
        }, 500); // 500ms delay to finish scrolling animation
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
      stopAlarm();
      cancelTimer();
    });
  }

  // Event Listener für Pause Button
  if (pauseBtn) {
    pauseBtn.addEventListener('click', () => {
      if (alarmInterval) {
        stopAlarm();
        cancelTimer();
        return;
      }
      if (isPaused) {
        resumeTimer();
      } else {
        pauseTimer();
      }
    });
  }

  // Socket Sync Event Listeners
  if (socket) {
    socket.on('timer-started', (data) => {
      syncStartTimer(data.duration, data.remaining, data.isPaused);
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

      // Apply 3D perspective distortion based on distance from center
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
  // Trigger initial frame calculation
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
  stopAlarm();
  timerDuration = seconds;
  timerRemaining = seconds;
  isPaused = false;

  updateActiveUI();
  setupContainer.style.display = 'none';
  activeContainer.style.display = 'flex';

  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(tick, 1000);

  // Send socket broadcast
  if (window.socket) {
    window.socket.emit('timer-start', {
      duration: timerDuration,
      remaining: timerRemaining,
      isPaused: isPaused
    });
  }
}

function syncStartTimer(duration, remaining, paused) {
  stopAlarm();
  timerDuration = duration;
  timerRemaining = remaining;
  isPaused = paused;

  updateActiveUI();
  setupContainer.style.display = 'none';
  activeContainer.style.display = 'flex';

  if (timerInterval) clearInterval(timerInterval);
  if (!isPaused) {
    timerInterval = setInterval(tick, 1000);
  }

  // Widget-Sichtbarkeit erzwingen auf synchronisierten Clients
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
  if (timerRemaining <= 0) {
    triggerAlarm();
    return;
  }
  timerRemaining--;
  updateActiveUI();

  // Urgency indicator under 30s
  if (timerRemaining < 30) {
    activeContainer.classList.add('low-time');
  } else {
    activeContainer.classList.remove('low-time');
  }
}

function updateActiveUI() {
  // Format Zeit
  const hh = Math.floor(timerRemaining / 3600);
  const mm = Math.floor((timerRemaining % 3600) / 60);
  const ss = timerRemaining % 60;

  let displayStr = "";
  if (hh > 0) {
    displayStr = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
  } else {
    displayStr = `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
  }

  if (countdownText) {
    countdownText.textContent = displayStr;
  }

  // Update SVG Ring
  if (ringCircle && timerDuration > 0) {
    const totalCircumference = 301.6; // 2 * Math.PI * 48
    const progress = timerRemaining / timerDuration;
    const offset = totalCircumference * (1 - progress);
    ringCircle.setAttribute('stroke-dashoffset', offset.toFixed(1));
  }
}

export function pauseTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  isPaused = true;
  if (pauseBtn) {
    pauseBtn.innerHTML = `<i class="fas fa-play"></i> <span data-i18n="timer_btn_resume">Fortsetzen</span>`;
    pauseBtn.style.background = '#4fd8ff';
  }

  if (window.socket) {
    window.socket.emit('timer-pause');
  }
}

function syncPauseTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  isPaused = true;
  if (pauseBtn) {
    pauseBtn.innerHTML = `<i class="fas fa-play"></i> <span data-i18n="timer_btn_resume">Fortsetzen</span>`;
    pauseBtn.style.background = '#4fd8ff';
  }
}

export function resumeTimer() {
  isPaused = false;
  if (pauseBtn) {
    pauseBtn.innerHTML = `<i class="fas fa-pause"></i> <span data-i18n="timer_btn_pause">Pause</span>`;
    pauseBtn.style.background = 'var(--primary)';
  }
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(tick, 1000);

  if (window.socket) {
    window.socket.emit('timer-resume');
  }
}

function syncResumeTimer() {
  isPaused = false;
  if (pauseBtn) {
    pauseBtn.innerHTML = `<i class="fas fa-pause"></i> <span data-i18n="timer_btn_pause">Pause</span>`;
    pauseBtn.style.background = 'var(--primary)';
  }
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(tick, 1000);
}

export function cancelTimer() {
  stopAlarm();
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  timerDuration = 0;
  timerRemaining = 0;
  isPaused = false;

  if (activeContainer) activeContainer.classList.remove('low-time');
  if (setupContainer) setupContainer.style.display = 'flex';
  if (activeContainer) activeContainer.style.display = 'none';

  if (pauseBtn) {
    pauseBtn.innerHTML = `<i class="fas fa-pause"></i> <span data-i18n="timer_btn_pause">Pause</span>`;
    pauseBtn.style.background = 'var(--primary)';
  }

  // Restore wheel values to the selected targets
  if (drumHH && drumMM && drumSS) {
    setDrumValue(drumHH, targetHH, false);
    setDrumValue(drumMM, targetMM, false);
    setDrumValue(drumSS, targetSS, false);
  }

  if (window.socket) {
    window.socket.emit('timer-cancel');
  }
}

function syncCancelTimer() {
  stopAlarm();
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  timerDuration = 0;
  timerRemaining = 0;
  isPaused = false;

  if (activeContainer) activeContainer.classList.remove('low-time');
  if (setupContainer) setupContainer.style.display = 'flex';
  if (activeContainer) activeContainer.style.display = 'none';

  if (pauseBtn) {
    pauseBtn.innerHTML = `<i class="fas fa-pause"></i> <span data-i18n="timer_btn_pause">Pause</span>`;
    pauseBtn.style.background = 'var(--primary)';
  }

  // Restore wheel values to the selected targets
  if (drumHH && drumMM && drumSS) {
    setDrumValue(drumHH, targetHH, false);
    setDrumValue(drumMM, targetMM, false);
    setDrumValue(drumSS, targetSS, false);
  }
}

function triggerAlarm() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  
  if (countdownText) {
    countdownText.textContent = "ALARM!";
  }
  activeContainer.classList.add('low-time');

  // Change pause button to Stop
  if (pauseBtn) {
    pauseBtn.innerHTML = `<i class="fas fa-stop-circle"></i> <span data-i18n="timer_btn_stop">Stop</span>`;
    pauseBtn.style.background = '#ef4444';
  }

  // Play Sound in Loop
  const soundType = localStorage.getItem('timer_alarm_sound') || 'sound-gong';
  playSound(soundType);
  
  if (alarmInterval) clearInterval(alarmInterval);
  alarmInterval = setInterval(() => {
    playSound(soundType);
  }, 2500);
}

function stopAlarm() {
  if (alarmInterval) {
    clearInterval(alarmInterval);
    alarmInterval = null;
  }
}

export function getTimerStatus() {
  return {
    active: timerInterval !== null || alarmInterval !== null,
    remaining: timerRemaining,
    duration: timerDuration,
    isPaused: isPaused,
    isAlarm: alarmInterval !== null
  };
}
