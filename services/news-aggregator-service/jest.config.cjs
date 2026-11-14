module.exports = {
  testEnvironment: 'node',
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/tests/manual/'],
  testMatch: [
    '<rootDir>/tests/**/*.test.js',
    '<rootDir>/src/**/*.test.js'
  ],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!src/**/index.js'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'lcov',
    'html'
  ],
  setupFilesAfterEnv: [],
  testTimeout: 30000, // 30 seconds for API calls
  verbose: true,
  forceExit: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  // Native ESM: run with node --experimental-vm-modules (see npm scripts); no transform needed
  transform: {},
};