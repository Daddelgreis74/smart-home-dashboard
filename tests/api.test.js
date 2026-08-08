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

  test('GET / should return index.html with dynamically injected package.json version', async () => {
    const { version } = require('../package.json');
    
    // Simulate setup completed
    const configPath = path.join(testDataDir, 'config.json');
    fs.mkdirSync(testDataDir, { recursive: true });
    fs.writeFileSync(configPath, JSON.stringify({ setup_completed: true }), 'utf8');

    const response = await request(app)
      .get('/')
      .expect('Content-Type', /html/)
      .expect(200);

    expect(response.text).toContain(`styles.css?v=${version}`);
    expect(response.text).toContain(`app.js?v=${version}`);
  });

  test('POST /api/tasmota/sensor-push should accept numeric values and ignore non-numeric values', async () => {
    // 1. Post a valid numeric payload
    await request(app)
      .post('/api/tasmota/sensor-push')
      .send({
        temperature: 24.5,
        humidity: 60,
        dewPoint: 15.2,
        batteryVoltage: 3.7,
        batteryPercent: 85
      })
      .expect(200);

    // 2. Fetch the sensor data and verify values are returned as numbers
    const getRes = await request(app)
      .get('/api/tasmota/sensor?ip=127.0.0.1')
      .expect(200);

    expect(getRes.body.success).toBe(true);
    expect(getRes.body.temperature).toBe(24.5);
    expect(getRes.body.batteryPercent).toBe(85);

    // 3. Post a malformed/non-numeric payload
    await request(app)
      .post('/api/tasmota/sensor-push')
      .send({
        temperature: 'corrupted',
        humidity: { nested: 'bad' },
        dewPoint: null,
        batteryVoltage: '3.7V',
        batteryPercent: 85 // keeping this one numeric
      })
      .expect(200);

    // 4. Fetch the sensor data again and verify bad types were rejected
    const getRes2 = await request(app)
      .get('/api/tasmota/sensor?ip=127.0.0.1')
      .expect(200);

    expect(getRes2.body.success).toBe(true);
    expect(getRes2.body.temperature).toBeUndefined();
    expect(getRes2.body.humidity).toBeUndefined();
    expect(getRes2.body.batteryVoltage).toBeUndefined();
    expect(getRes2.body.batteryPercent).toBe(85); // kept because it was numeric
  });

  test('GET /api/config/status and POST /api/config/setup should manage setup flow', async () => {
    const configPath = path.join(testDataDir, 'config.json');
    if (fs.existsSync(configPath)) fs.unlinkSync(configPath);

    const statusRes = await request(app)
      .get('/api/config/status')
      .expect(200);
    expect(statusRes.body.needsSetup).toBe(true);

    const setupData = {
      config: {
        dashboard_lang: 'de',
        dashboard_theme: 'theme-aurora',
        weather_location: 'Altenburg',
        weather_provider: 'openmeteo'
      },
      fritzbox: {
        ip: '192.168.178.1'
      },
      tasmota: [
        { ip: '192.168.178.51', name: 'Wohnzimmer Lampe' }
      ]
    };

    await request(app)
      .post('/api/config/setup')
      .send(setupData)
      .expect(200);

    const statusRes2 = await request(app)
      .get('/api/config/status')
      .expect(200);
    expect(statusRes2.body.needsSetup).toBe(false);

    const configContent = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    expect(configContent.setup_completed).toBe(true);

    const tasmotaPath = path.join(testDataDir, 'tasmota.json');
    const tasmotaContent = JSON.parse(fs.readFileSync(tasmotaPath, 'utf8'));
    expect(tasmotaContent[0].ip).toBe('192.168.178.51');
  });

  afterAll(() => {
    try {
      fs.rmSync(testDataDir, { recursive: true, force: true });
    } catch (e) {
      // ignore
    }
  });
});
