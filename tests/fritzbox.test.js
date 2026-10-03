const path = require('path');
const request = require('supertest');

// Set test data directory before loading the server
const testDataDir = path.join(__dirname, 'temp_test_data');
process.env.DATA_DIR = testDataDir;

const app = require('../server');
const fritzboxService = require('../src/services/fritzboxService');

describe('Fritz!Box Service & API Tests', () => {
  describe('Caller Name Resolution', () => {
    test('resolveCallerName returns original number if phonebook is empty or no match', () => {
      const result = fritzboxService.resolveCallerName('01701234567');
      expect(result).toBe('01701234567');
    });

    test('resolveCallerName handles empty or non-string inputs safely with fallback', () => {
      expect(fritzboxService.resolveCallerName('')).toBe('Unbekannter Anrufer');
      expect(fritzboxService.resolveCallerName(null)).toBe('Unbekannter Anrufer');
      expect(fritzboxService.resolveCallerName(undefined)).toBe('Unbekannter Anrufer');
    });
  });

  describe('Fritz!Box REST API Endpoints', () => {
    test('GET /api/fritzbox/status should return status structure', async () => {
      const response = await request(app)
        .get('/api/fritzbox/status')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('modelName');
      expect(response.body).toHaveProperty('maxDown');
      expect(response.body).toHaveProperty('maxUp');
      expect(response.body).toHaveProperty('guestWifi');
    });

    test('GET /api/fritzbox/guest-wifi should return guest wifi data', async () => {
      const response = await request(app)
        .get('/api/fritzbox/guest-wifi')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('enabled');
      expect(response.body).toHaveProperty('ssid');
      expect(response.body).toHaveProperty('key');
    });

    test('POST /api/fritzbox/guest-wifi with missing/invalid enable field returns 400', async () => {
      const response = await request(app)
        .post('/api/fritzbox/guest-wifi')
        .send({ foo: 'bar' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('muss ein Boolean sein');
    });

    test('POST /api/fritzbox/phonebook/reload returns 200 or 500 without crashing', async () => {
      const response = await request(app)
        .post('/api/fritzbox/phonebook/reload');

      expect([200, 500]).toContain(response.status);
    });
  });
});
