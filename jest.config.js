module.exports = {
  testEnvironment: 'node',
  clearMocks: true,
  setupFilesAfterEnv: ['<rootDir>/tests/utils/setup.js'],
  globalTeardown: '<rootDir>/tests/utils/globalTeardown.js',
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: [
    'src/controllers/**/*.js',
    'src/middleware/**/*.js',
    'src/utils/**/*.js'
  ],
  coverageDirectory: 'coverage',
  verbose: true,
};
