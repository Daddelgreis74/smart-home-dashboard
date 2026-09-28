const { getTimerPayload, resetServerTimer } = require('../src/sockets/index');

describe('Timer Socket Synchronization', () => {
  beforeEach(() => {
    resetServerTimer();
  });

  test('liefert standardmaessig inaktiven Timer-Payload', () => {
    const payload = getTimerPayload();
    expect(payload.active).toBe(false);
    expect(payload.duration).toBe(0);
    expect(payload.remaining).toBe(0);
    expect(payload.isPaused).toBe(false);
    expect(payload.isAlarm).toBe(false);
  });

  test('berechnet verbleibende Restzeit dynamisch anhand von endTime', () => {
    const now = Date.now();
    // Simuliere einen gestarteten Timer mit 60 Sekunden, vor 10 Sekunden gestartet
    const { initSockets } = require('../src/sockets/index');
    let connectionHandler = null;
    const mockIo = {
      on: jest.fn((event, handler) => {
        if (event === 'connection') connectionHandler = handler;
      }),
      emit: jest.fn()
    };

    initSockets(mockIo);

    // Mock Client startet Timer
    const mockSocket = {
      emit: jest.fn(),
      broadcast: { emit: jest.fn() },
      on: jest.fn()
    };

    // Finde timer-start listener
    const handlers = {};
    mockSocket.on.mockImplementation((event, fn) => {
      handlers[event] = fn;
    });

    connectionHandler(mockSocket);

    // Starte Timer mit 60 Sekunden
    handlers['timer-start']({ duration: 60 });

    const payload = getTimerPayload();
    expect(payload.active).toBe(true);
    expect(payload.duration).toBe(60);
    expect(payload.remaining).toBe(60);
    expect(payload.endTime).toBeGreaterThan(now);
    expect(mockSocket.broadcast.emit).toHaveBeenCalledWith('timer-started', expect.objectContaining({
      active: true,
      duration: 60,
      remaining: 60
    }));

    // Simuliere Pause
    handlers['timer-pause']();
    const pausedPayload = getTimerPayload();
    expect(pausedPayload.isPaused).toBe(true);
    expect(pausedPayload.endTime).toBe(0);
    expect(mockSocket.broadcast.emit).toHaveBeenCalledWith('timer-paused', expect.objectContaining({
      isPaused: true
    }));

    // Simuliere Resume
    handlers['timer-resume']();
    const resumedPayload = getTimerPayload();
    expect(resumedPayload.isPaused).toBe(false);
    expect(resumedPayload.endTime).toBeGreaterThan(Date.now());
    expect(mockSocket.broadcast.emit).toHaveBeenCalledWith('timer-resumed', expect.objectContaining({
      isPaused: false
    }));

    // Simuliere Alarm
    handlers['timer-alarm']();
    const alarmPayload = getTimerPayload();
    expect(alarmPayload.isAlarm).toBe(true);
    expect(alarmPayload.remaining).toBe(0);
    expect(mockSocket.broadcast.emit).toHaveBeenCalledWith('timer-alarm', { id: 1 });

    // Simuliere Cancel
    handlers['timer-cancel']();
    const cancelledPayload = getTimerPayload();
    expect(cancelledPayload.active).toBe(false);
    expect(cancelledPayload.remaining).toBe(0);
    expect(mockSocket.broadcast.emit).toHaveBeenCalledWith('timer-cancelled', { id: 1 });
  });

  test('neue Clients erhalten bei aktivem Timer timer-started und NIEMALS timer-cancelled', () => {
    const { initSockets } = require('../src/sockets/index');
    let connectionHandler = null;
    const mockIo = {
      on: jest.fn((event, handler) => {
        if (event === 'connection') connectionHandler = handler;
      }),
      emit: jest.fn()
    };
    initSockets(mockIo);

    const client1 = {
      emit: jest.fn(),
      broadcast: { emit: jest.fn() },
      on: jest.fn()
    };
    const c1Handlers = {};
    client1.on.mockImplementation((event, fn) => {
      c1Handlers[event] = fn;
    });
    connectionHandler(client1);

    // Client 1 startet Timer
    c1Handlers['timer-start']({ duration: 120 });

    // Neuer Client 2 verbindet sich waehrend Timer laeuft
    const client2 = {
      emit: jest.fn(),
      broadcast: { emit: jest.fn() },
      on: jest.fn()
    };
    connectionHandler(client2);

    // Client 2 muss timer-started erhalten
    expect(client2.emit).toHaveBeenCalledWith('timer-started', expect.objectContaining({
      active: true,
      duration: 120,
      remaining: 120
    }));

    // Client 2 darf NIEMALS ein timer-cancelled fuer einen Geistertimer (z.B. id 2) erhalten!
    expect(client2.emit).not.toHaveBeenCalledWith('timer-cancelled', expect.anything());
  });
});
