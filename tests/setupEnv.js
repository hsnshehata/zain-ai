process.env.JWT_SECRET = 'testsecret';
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/zainai_test';
process.env.PORT = 0; // let supertest pick random
process.env.METRICS_TOKEN = 'test-metrics';
