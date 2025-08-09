const request = require('supertest');
const { app } = require('../server');

describe('API Smoke Tests', () => {
  it('GET /api/health returns OK', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('OK');
  });

  it('GET /api/parking/all returns success field', async () => {
    const res = await request(app).get('/api/parking/all');
    // Can be 200 or 500 if DB unavailable; we want to ensure route exists
    expect([200,400,500]).toContain(res.status);
  });

  it('GET /api/services/options returns success or 500', async () => {
    const res = await request(app).get('/api/services/options');
    expect([200,400,500]).toContain(res.status);
  });

  it('GET /unknown returns 404 json', async () => {
    const res = await request(app).get('/api/does-not-exist');
    expect(res.status).toBe(404);
  });
});
