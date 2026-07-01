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
});
