const path = require('path');
const fs = require('fs');

// Set test data directory before loading the server to avoid corrupting live config.json
const testDataDir = path.join(__dirname, 'temp_test_data');
process.env.DATA_DIR = testDataDir;

const request = require('supertest');
const app = require('../server');

describe('API Endpoints Tests', () => {
  test('GET /api/config should return dashboard config data', async () => {
    const response = await request(app)
      .get('/api/config')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toBeDefined();
  });

  test('POST /api/tasmota/toggle with missing IP should return 400', async () => {
    const response = await request(app)
      .post('/api/tasmota/toggle')
      .send({})
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toContain('Ungültige lokale IPv4-Adresse');
  });

  test('POST /api/config with invalid payload should return 400', async () => {
    const response = await request(app)
      .post('/api/config')
      .send({ widgetLayout: 'not-an-array' })
      .expect(400);

    expect(response.body.ok).toBe(false);
  });

  test('POST /api/config with non-whitelisted key should return 400', async () => {
    const response = await request(app)
      .post('/api/config')
      .send({ arbitrary_key: 'hacked' })
      .expect(400);

    expect(response.body.ok).toBe(false);
    expect(response.body.error).toContain('Ungültiger Konfigurationsschlüssel');
  });

  test('POST /api/config and GET /api/config should mask sensitive keys', async () => {
    // 1. Post a configuration with keys
    await request(app)
      .post('/api/config')
      .send({ 
        jarvis_gemini_api_key: 'AIzaSyTestKey123',
        weather_api_key: 'wkey123456789'
      })
      .expect(200);

    // 2. Get it and verify they are masked
    const getRes = await request(app)
      .get('/api/config')
      .expect(200);

    expect(getRes.body.jarvis_gemini_api_key).toBe('********');
    expect(getRes.body.weather_api_key).toBe('********');
  });

  test('POST /api/tasmota with invalid payload should return 400', async () => {
    const response = await request(app)
      .post('/api/tasmota')
      .send({ invalid: 'object' })
      .expect(400);

    expect(response.body.success).toBe(false);
  });

  afterAll(() => {
    try {
      fs.rmSync(testDataDir, { recursive: true, force: true });
    } catch (e) {
      // ignore
    }
  });
});
