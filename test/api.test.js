const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

process.env.ALLOW_INSECURE_ENV = 'true';
process.env.CORS_ORIGIN = 'http://localhost:3000,http://localhost:5050';

const sequelize = require('../src/config/database');
const { createApp } = require('../src/app');

test('GET /health returns ok and request id', async () => {
  const app = createApp();
  const res = await request(app).get('/health').expect(200);

  assert.equal(res.body.status, 'ok');
  assert.ok(res.body.requestId);
  assert.ok(res.headers['x-request-id']);
});

test('GET / redirects to login page', async () => {
  const app = createApp();
  const res = await request(app).get('/').expect(302);

  assert.equal(res.headers.location, '/login.html');
});

test('GET /health blocks disallowed CORS origin', async () => {
  const app = createApp();
  await request(app)
    .get('/health')
    .set('Origin', 'https://evil.example')
    .expect(403);
});

test('GET /ready returns ready when db auth succeeds', async () => {
  const app = createApp();
  const originalAuth = sequelize.authenticate;

  sequelize.authenticate = async () => true;
  try {
    const res = await request(app).get('/ready').expect(200);
    assert.equal(res.body.status, 'ready');
    assert.equal(res.body.db, 'ok');
  } finally {
    sequelize.authenticate = originalAuth;
  }
});

test('GET /ready returns 503 when db auth fails', async () => {
  const app = createApp();
  const originalAuth = sequelize.authenticate;

  sequelize.authenticate = async () => {
    throw new Error('db down');
  };

  try {
    const res = await request(app).get('/ready').expect(503);
    assert.equal(res.body.status, 'not_ready');
    assert.equal(res.body.db, 'down');
  } finally {
    sequelize.authenticate = originalAuth;
  }
});
