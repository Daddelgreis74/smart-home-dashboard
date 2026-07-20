const fileStore = require('../utils/fileStore');
const { getMergedCalls, pingTcp } = require('../services/fritzboxService');
const { getSystemStatus } = require('../services/systemService');

let serverTimers = {
  1: { duration: 0, remaining: 0, isPaused: false, lastUpdated: 0, active: false },
  2: { duration: 0, remaining: 0, isPaused: false, lastUpdated: 0, active: false }
};

function initSockets(io) {
  io.on('connection', (socket) => {
    // Aktuellen Timer-Status an neu verbundene/wiederverbundene Clients senden
    [1, 2].forEach(id => {
      const timer = serverTimers[id];
      if (timer.active) {
        let currentRemaining = timer.remaining;
        if (!timer.isPaused) {
          const elapsed = Math.floor((Date.now() - timer.lastUpdated) / 1000);
          currentRemaining = Math.max(0, timer.remaining - elapsed);
        }
        socket.emit('timer-started', {
          id: id,
          duration: timer.duration,
          remaining: currentRemaining,
          isPaused: timer.isPaused
        });
      } else {
        socket.emit('timer-cancelled', { id });
      }
    });

    socket.on('update-layout', (layout) => socket.broadcast.emit('layout-updated', layout));
    
    socket.on('timer-start', (data) => {
      const id = data.id || 1;
      serverTimers[id] = {
        duration: data.duration,
        remaining: data.remaining,
        isPaused: data.isPaused,
        lastUpdated: Date.now(),
        active: true
      };
      socket.broadcast.emit('timer-started', data);
    });

    socket.on('timer-pause', (data) => {
      const id = data?.id || 1;
      const timer = serverTimers[id];
      if (timer.active && !timer.isPaused) {
        const elapsed = Math.floor((Date.now() - timer.lastUpdated) / 1000);
        timer.remaining = Math.max(0, timer.remaining - elapsed);
        timer.isPaused = true;
        timer.lastUpdated = Date.now();
      }
      socket.broadcast.emit('timer-paused', { id });
    });

    socket.on('timer-resume', (data) => {
      const id = data?.id || 1;
      const timer = serverTimers[id];
      if (timer.active && timer.isPaused) {
        timer.isPaused = false;
        timer.lastUpdated = Date.now();
      }
      socket.broadcast.emit('timer-resumed', { id });
    });

    socket.on('timer-cancel', (data) => {
      const id = data?.id || 1;
      serverTimers[id] = {
        duration: 0,
        remaining: 0,
        isPaused: false,
        lastUpdated: 0,
        active: false
      };
      socket.broadcast.emit('timer-cancelled', { id });
    });

    socket.emit('fritz-calls', getMergedCalls());
    socket.emit('presence-list-updated', fileStore.presenceRAM);
    socket.emit('cameras-updated', fileStore.camerasRAM);
    socket.emit('appointments-updated', fileStore.appointmentsRAM);
  });

  // System-Status-Timer (alle 5 Sekunden)
  setInterval(async () => {
    const status = await getSystemStatus();
    if (status) {
      io.emit('sys-status', status);
    }
  }, 5000);

  // Fritz!Box/Internet-Status-Timer (alle 10 Sekunden)
  setInterval(async () => {
    const fritzConfig = fileStore.fritzConfig;
    if (!fritzConfig.ip) return;
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
}

module.exports = {
  initSockets
};
