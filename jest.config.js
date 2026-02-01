module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.js'],
  verbose: true,
  setupFilesAfterEnv: ['<rootDir>/tests/setupEnv.js'],
  forceExit: true,
};
