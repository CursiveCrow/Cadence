/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/test-setup.ts'],
  moduleNameMapper: {
    '^@cadence/core$': '<rootDir>/source/core',
    '^@cadence/state$': '<rootDir>/source/infrastructure/persistence', 
    '^@cadence/crdt$': '<rootDir>/source/infrastructure/persistence/crdt',
    '^@cadence/renderer$': '<rootDir>/source/renderer',
    '^@cadence/platform-services$': '<rootDir>/source/infrastructure/platform/services',
    '^@cadence/ui$': '<rootDir>/source/surface/components',
  },
  testMatch: [
    '**/__tests__/**/*.(ts|tsx|js)',
    '**/*.(test|spec).(ts|tsx|js)'
  ],
  collectCoverageFrom: [
    'source/**/*.{ts,tsx}',
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
