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

  test('Camera API - SSRF checks and ptzPass masking', async () => {
    // 1. Post a camera with an invalid public stream URL
    const res1 = await request(app)
      .post('/api/cameras')
      .send({
        name: 'Public Stream Cam',
        url: 'http://8.8.8.8/mjpeg'
      })
      .expect(400);
    expect(res1.body.error).toContain('Kamera-URL muss eine private/lokale Adresse sein');

    // 2. Post a camera with an invalid public PTZ Host
    const res2 = await request(app)
      .post('/api/cameras')
      .send({
        name: 'Public PTZ Cam',
        url: 'http://192.168.1.100/mjpeg',
        ptz: true,
        ptzHost: '8.8.8.8'
      })
      .expect(400);
    expect(res2.body.error).toContain('PTZ-Host muss eine private/lokale Adresse sein');

    // 3. Post a valid camera with a password and check if response is masked
    const camPayload = {
      id: 'cam123',
      name: 'Local PTZ Cam',
      url: 'http://192.168.1.100/mjpeg',
      ptz: true,
      ptzHost: '192.168.1.101',
      ptzPort: 80,
      ptzUser: 'admin',
      ptzPass: 'supersecret123'
    };

    const res3 = await request(app)
      .post('/api/cameras')
      .send(camPayload)
      .expect(200);
    
    expect(res3.body.camera.ptzPass).toBe('********');

    // 4. GET /api/cameras should return masked ptzPass
    const res4 = await request(app)
      .get('/api/cameras')
      .expect(200);
    
    const camInList = res4.body.find(c => c.id === 'cam123');
    expect(camInList).toBeDefined();
    expect(camInList.ptzPass).toBe('********');

    // 5. Updating the camera with ******** password should preserve the original password
    const res5 = await request(app)
      .post('/api/cameras')
      .send({
        ...camPayload,
        name: 'Renamed Local PTZ Cam',
        ptzPass: '********'
      })
      .expect(200);
    expect(res5.body.camera.name).toBe('Renamed Local PTZ Cam');
    expect(res5.body.camera.ptzPass).toBe('********');

    // Verify in file store / backend memory that the actual password is still 'supersecret123'
    const camerasFile = path.join(testDataDir, 'cameras.json');
    const storedCams = JSON.parse(fs.readFileSync(camerasFile, 'utf8'));
    const storedCam = storedCams.find(c => c.id === 'cam123');
    expect(storedCam.ptzPass).toBe('supersecret123');

    // 6. Test POST /api/cameras/ptz/:id with invalid public PTZ Host (manipulated manually after saving)
    // We will save a camera with a public host in memory to bypass the POST validation, simulating a corrupted/edited file
    const fileStore = require('../src/utils/fileStore');
    fileStore.camerasRAM.push({
      id: 'hackedcam',
      name: 'Hacked Cam',
      url: 'http://192.168.1.100/mjpeg',
      ptz: true,
      ptzHost: '8.8.8.8' // public IP
    });

    const res6 = await request(app)
      .post('/api/cameras/ptz/hackedcam')
      .send({ direction: 'left' })
      .expect(400);
    expect(res6.body.error).toContain('PTZ-Host muss eine private/lokale Adresse sein');
  });

  afterAll(() => {
    try {
      fs.rmSync(testDataDir, { recursive: true, force: true });
    } catch (e) {
      // ignore
    }
  });
});
