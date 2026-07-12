const fileStore = require('../utils/fileStore');
const { getMergedCalls, pingTcp } = require('../services/fritzboxService');
const { getSystemStatus } = require('../services/systemService');

function initSockets(io) {
  io.on('connection', (socket) => {
    socket.on('update-layout', (layout) => socket.broadcast.emit('layout-updated', layout));
    socket.on('timer-start', (data) => socket.broadcast.emit('timer-started', data));
    socket.on('timer-pause', () => socket.broadcast.emit('timer-paused'));
    socket.on('timer-resume', () => socket.broadcast.emit('timer-resumed'));
    socket.on('timer-cancel', () => socket.broadcast.emit('timer-cancelled'));
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
