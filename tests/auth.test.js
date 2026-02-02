const request = require('supertest');
const mongoose = require('mongoose');
let app;

beforeAll(async () => {
  // حمل السيرفر كسيرفر Express بدون الاستماع لمنفذ ثابت
  app = require('../server/server');
  await mongoose.connect(process.env.MONGODB_URI, { dbName: 'zainai_test' });
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});

describe('Auth endpoints', () => {
  test('rejects weak password on register', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'user@example.com',
        username: 'user1',
        password: 'weakpass',
        confirmPassword: 'weakpass',
        botName: 'bot',
      });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('rate limits login after repeated attempts', async () => {
    for (let i = 0; i < 7; i++) {
      await request(app)
        .post('/api/auth/login')
        .send({ username: 'nouser', password: 'wrong' });
    }
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'nouser', password: 'wrong' });
    expect(res.status).toBe(429);
  });
});
