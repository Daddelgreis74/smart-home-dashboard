
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

export function initTimer(socket) {
  setupContainer = document.querySelector('.timer-setup-container');
  activeContainer = document.querySelector('.timer-active-container');
  ringCircle = document.getElementById('timerRingCircle');
  countdownText = document.getElementById('timerCountdownText');
  startBtn = document.getElementById('timerStartBtn');
  cancelBtn = document.getElementById('timerCancelBtn');
  pauseBtn = document.getElementById('timerPauseBtn');

  if (!setupContainer || !activeContainer) return;

  // Event Listeners für Presets
  document.querySelectorAll('.timer-preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const seconds = parseInt(btn.getAttribute('data-time'), 10);
      if (seconds > 0) {
        startTimer(seconds);
      }
    });
  });

  // Event Listener für Start Button
  if (startBtn) {
    startBtn.addEventListener('click', () => {
      const hh = parseInt(document.getElementById('timerInputHH').value || 0, 10);
      const mm = parseInt(document.getElementById('timerInputMM').value || 0, 10);
      const ss = parseInt(document.getElementById('timerInputSS').value || 0, 10);
      const totalSeconds = hh * 3600 + mm * 60 + ss;
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

function startTimer(seconds) {
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

function pauseTimer() {
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

function resumeTimer() {
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

function cancelTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  timerDuration = 0;
  timerRemaining = 0;
  isPaused = false;

  activeContainer.classList.remove('low-time');
  setupContainer.style.display = 'flex';
  activeContainer.style.display = 'none';

  if (pauseBtn) {
    pauseBtn.innerHTML = `<i class="fas fa-pause"></i> <span data-i18n="timer_btn_pause">Pause</span>`;
    pauseBtn.style.background = 'var(--primary)';
  }

  if (window.socket) {
    window.socket.emit('timer-cancel');
  }
}

function syncCancelTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  timerDuration = 0;
  timerRemaining = 0;
  isPaused = false;

  activeContainer.classList.remove('low-time');
  setupContainer.style.display = 'flex';
  activeContainer.style.display = 'none';

  if (pauseBtn) {
    pauseBtn.innerHTML = `<i class="fas fa-pause"></i> <span data-i18n="timer_btn_pause">Pause</span>`;
    pauseBtn.style.background = 'var(--primary)';
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
