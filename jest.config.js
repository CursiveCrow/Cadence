/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/test-setup.ts'],
  moduleNameMapper: {
    '^@cadence/core$': '<rootDir>/apps/desktop/src/core',
    '^@cadence/state$': '<rootDir>/apps/desktop/src/surface/state',
    '^@cadence/state/(.*)$': '<rootDir>/apps/desktop/src/surface/state/$1',
    '^@cadence/renderer$': '<rootDir>/apps/desktop/src/renderer',
    '^@cadence/platform-services$': '<rootDir>/apps/desktop/src/platform',
    '^@cadence/ui$': '<rootDir>/apps/desktop/src/surface/ui',
  },
  testMatch: [
    '**/__tests__/**/*.(ts|tsx|js)',
    '**/*.(test|spec).(ts|tsx|js)'
  ],
  collectCoverageFrom: [
    'apps/desktop/src/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/coverage/**'
  ],
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest'
  },
  transformIgnorePatterns: ['/node_modules/'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  testTimeout: 10000,
  maxWorkers: '50%'
};
