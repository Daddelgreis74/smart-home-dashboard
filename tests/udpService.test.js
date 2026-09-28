const dgram = require('dgram');
const { initUdpListener, closeUdpListener } = require('../src/services/udpService');

describe('UDP Sensor Service', () => {
  const TEST_PORT = 9876;
  let mockIo;
  let clientSocket;

  beforeEach(() => {
    mockIo = {
      emit: jest.fn()
    };
    clientSocket = dgram.createSocket('udp4');
  });

  afterEach((done) => {
    closeUdpListener();
    if (clientSocket) {
      try {
        clientSocket.close(() => done());
        return;
      } catch (_) {}
    }
    done();
  });

  test('empfaengt JSON-Broadcast und emittiert sensor_update ueber socket.io', (done) => {
    initUdpListener(mockIo, TEST_PORT, '127.0.0.1');

    const testPayload = {
      sensor: 'solar_outdoor',
      temperature: 21.5,
      humidity: 58.2,
      dewPoint: 12.9,
      batteryVoltage: 4.12,
      batteryPercent: 98
    };

    const message = Buffer.from(JSON.stringify(testPayload));

    // Kurze Pause, damit der Server-Socket gebunden ist
    setTimeout(() => {
      clientSocket.send(message, TEST_PORT, '127.0.0.1', (err) => {
        expect(err).toBeNull();

        setTimeout(() => {
          expect(mockIo.emit).toHaveBeenCalledWith(
            'sensor_update',
            expect.objectContaining({
              sensor: 'solar_outdoor',
              temperature: 21.5,
              humidity: 58.2,
              dewPoint: 12.9,
              batteryVoltage: 4.12,
              batteryPercent: 98,
              senderIp: '127.0.0.1'
            })
          );

          expect(mockIo.emit).toHaveBeenCalledWith(
            'sensor-update',
            expect.objectContaining({
              ip: '127.0.0.1',
              data: expect.objectContaining({
                sensor: 'solar_outdoor'
              })
            })
          );

          done();
        }, 150);
      });
    }, 100);
  });

  test('ignoriert fehlerhafte Nicht-JSON UDP-Pakete ohne Absturz', (done) => {
    initUdpListener(mockIo, TEST_PORT, '127.0.0.1');

    const invalidMsg = Buffer.from('NOT_A_JSON_STRING');

    setTimeout(() => {
      clientSocket.send(invalidMsg, TEST_PORT, '127.0.0.1', (err) => {
        expect(err).toBeNull();

        setTimeout(() => {
          expect(mockIo.emit).not.toHaveBeenCalled();
          done();
        }, 100);
      });
    }, 100);
  });

  test('ignoriert primitive oder leere JSON-Werte', (done) => {
    initUdpListener(mockIo, TEST_PORT, '127.0.0.1');

    const primitiveMsg = Buffer.from('12345');

    setTimeout(() => {
      clientSocket.send(primitiveMsg, TEST_PORT, '127.0.0.1', (err) => {
        expect(err).toBeNull();

        setTimeout(() => {
          expect(mockIo.emit).not.toHaveBeenCalled();
          done();
        }, 100);
      });
    }, 100);
  });
});
