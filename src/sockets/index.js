const fileStore = require('../utils/fileStore');
const { getMergedCalls, pingTcp } = require('../services/fritzboxService');
const { getSystemStatus } = require('../services/systemService');

let serverTimer = {
  duration: 0,
  remaining: 0,
  isPaused: false,
  lastUpdated: 0,
  active: false
};

function initSockets(io) {
  io.on('connection', (socket) => {
    // Aktuellen Timer-Status an neu verbundene/wiederverbundene Clients senden
    if (serverTimer.active) {
      let currentRemaining = serverTimer.remaining;
      if (!serverTimer.isPaused) {
        const elapsed = Math.floor((Date.now() - serverTimer.lastUpdated) / 1000);
        currentRemaining = Math.max(0, serverTimer.remaining - elapsed);
      }
      socket.emit('timer-started', {
        duration: serverTimer.duration,
        remaining: currentRemaining,
        isPaused: serverTimer.isPaused
      });
    } else {
      socket.emit('timer-cancelled');
    }

    socket.on('update-layout', (layout) => socket.broadcast.emit('layout-updated', layout));
    
    socket.on('timer-start', (data) => {
      serverTimer = {
        duration: data.duration,
        remaining: data.remaining,
        isPaused: data.isPaused,
        lastUpdated: Date.now(),
        active: true
      };
      socket.broadcast.emit('timer-started', data);
    });

    socket.on('timer-pause', () => {
      if (serverTimer.active && !serverTimer.isPaused) {
        const elapsed = Math.floor((Date.now() - serverTimer.lastUpdated) / 1000);
        serverTimer.remaining = Math.max(0, serverTimer.remaining - elapsed);
        serverTimer.isPaused = true;
        serverTimer.lastUpdated = Date.now();
      }
      socket.broadcast.emit('timer-paused');
    });

    socket.on('timer-resume', () => {
      if (serverTimer.active && serverTimer.isPaused) {
        serverTimer.isPaused = false;
        serverTimer.lastUpdated = Date.now();
      }
      socket.broadcast.emit('timer-resumed');
    });

    socket.on('timer-cancel', () => {
      serverTimer = {
        duration: 0,
        remaining: 0,
        isPaused: false,
        lastUpdated: 0,
        active: false
      };
      socket.broadcast.emit('timer-cancelled');
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
