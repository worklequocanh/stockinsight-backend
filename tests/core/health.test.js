const request = require('supertest');
const app = require('../../src/app');
const { setupMasterData } = require('../utils/helpers');

describe('Health API', () => {
  it('nên trả về 200 OK cho endpoint health check', async () => {
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe('ok');
    expect(response.body.data).toHaveProperty('timestamp');
  });
});
