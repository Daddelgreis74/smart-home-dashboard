const fileStore = require('../utils/fileStore');
const { getMergedCalls, pingTcp } = require('../services/fritzboxService');
const { getSystemStatus } = require('../services/systemService');

let serverTimer = {
  duration: 0,
  remaining: 0,
  endTime: 0,
  isPaused: false,
  isAlarm: false,
  active: false,
  lastUpdated: 0
};

function getTimerPayload() {
  const now = Date.now();
  let remaining = serverTimer.remaining;
  if (serverTimer.active && !serverTimer.isPaused && serverTimer.endTime > 0) {
    remaining = Math.max(0, Math.ceil((serverTimer.endTime - now) / 1000));
    if (remaining === 0 && !serverTimer.isAlarm) {
      serverTimer.isAlarm = true;
    }
  }
  return {
    id: 1,
    active: serverTimer.active,
    duration: serverTimer.duration,
    remaining: remaining,
    endTime: serverTimer.endTime,
    isPaused: serverTimer.isPaused,
    isAlarm: serverTimer.isAlarm
  };
}

function resetServerTimer() {
  serverTimer = {
    duration: 0,
    remaining: 0,
    endTime: 0,
    isPaused: false,
    isAlarm: false,
    active: false,
    lastUpdated: 0
  };
}

function initSockets(io) {
  io.on('connection', (socket) => {
    // Aktuellen Timer-Status an neu verbundene/wiederverbundene Clients senden
    const timerPayload = getTimerPayload();
    if (timerPayload.active) {
      socket.emit('timer-started', timerPayload);
    } else {
      socket.emit('timer-cancelled', { id: 1 });
    }

    socket.on('update-layout', (layout) => socket.broadcast.emit('layout-updated', layout));
    
    socket.on('timer-start', (data) => {
      const duration = Number(data?.duration) || 0;
      if (duration <= 0) return;
      const now = Date.now();
      serverTimer = {
        duration,
        remaining: duration,
        endTime: now + duration * 1000,
        isPaused: false,
        isAlarm: false,
        active: true,
        lastUpdated: now
      };
      const payload = getTimerPayload();
      socket.broadcast.emit('timer-started', payload);
    });

    socket.on('timer-pause', () => {
      if (serverTimer.active && !serverTimer.isPaused) {
        const now = Date.now();
        const remaining = Math.max(0, Math.ceil((serverTimer.endTime - now) / 1000));
        serverTimer.remaining = remaining;
        serverTimer.endTime = 0;
        serverTimer.isPaused = true;
        serverTimer.lastUpdated = now;
      }
      const payload = getTimerPayload();
      socket.broadcast.emit('timer-paused', payload);
    });

    socket.on('timer-resume', () => {
      if (serverTimer.active && serverTimer.isPaused && serverTimer.remaining > 0) {
        const now = Date.now();
        serverTimer.endTime = now + serverTimer.remaining * 1000;
        serverTimer.isPaused = false;
        serverTimer.lastUpdated = now;
      }
      const payload = getTimerPayload();
      socket.broadcast.emit('timer-resumed', payload);
    });

    socket.on('timer-cancel', () => {
      resetServerTimer();
      socket.broadcast.emit('timer-cancelled', { id: 1 });
    });

    socket.on('timer-alarm', () => {
      if (serverTimer.active) {
        serverTimer.isAlarm = true;
        serverTimer.remaining = 0;
        serverTimer.endTime = 0;
        socket.broadcast.emit('timer-alarm', { id: 1 });
      }
    });

    // Sticky Note Live-Sync
    socket.on('note-update', (data) => {
      socket.broadcast.emit('note-updated', data);
    });

    socket.on('note-clear', () => {
      socket.broadcast.emit('note-cleared');
    });

    socket.emit('fritz-calls', getMergedCalls());
    socket.emit('presence-list-updated', fileStore.presenceRAM);
    socket.emit('cameras-updated', fileStore.camerasRAM);
    socket.emit('appointments-updated', fileStore.appointmentsRAM);
  });

  // System-Status-Timer (alle 5 Sekunden)
  const sysTimer = setInterval(async () => {
    const status = await getSystemStatus();
    if (status) {
      io.emit('sys-status', status);
    }
  }, 5000);
  if (sysTimer && typeof sysTimer.unref === 'function') sysTimer.unref();

  // Fritz!Box/Internet-Status-Timer (alle 10 Sekunden)
  const fritzTimer = setInterval(async () => {
    const fritzConfig = fileStore.fritzConfig;
    if (!fritzConfig || !fritzConfig.ip) return;
    try {
      const fritzPing = await pingTcp(fritzConfig.ip, 80, 2500);
      const internetPing = await pingTcp('1.1.1.1', 53, 2500);
      io.emit('fritz-status', {
        fritzOnline: fritzPing.online,
        fritzLatency: fritzPing.latency,
        internetOnline: internetPing.online,
        internetLatency: internetPing.latency
      });
    } catch(e) {}
  }, 10000);
  if (fritzTimer && typeof fritzTimer.unref === 'function') fritzTimer.unref();
}

module.exports = {
  initSockets,
  getTimerPayload,
  resetServerTimer
};
