/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/test-setup.ts'],
  moduleNameMapper: {
    '^@cadence/core$': '<rootDir>/packages/core/src',
    '^@cadence/model$': '<rootDir>/packages/model/src',
    '^@cadence/crdt$': '<rootDir>/packages/crdt/src',
    '^@cadence/renderer$': '<rootDir>/packages/renderer/src',
    '^@cadence/renderer/react$': '<rootDir>/packages/renderer/src/react',
    '^@cadence/platform-services$': '<rootDir>/packages/platform-services/src',
    '^@cadence/ui$': '<rootDir>/packages/ui/src',
    '^@cadence/view$': '<rootDir>/packages/view/src',
    '^@cadence/viewmodel$': '<rootDir>/packages/viewmodel/src',
    '^@cadence/repositories$': '<rootDir>/packages/repositories/src',
  },
  testMatch: ['**/__tests__/**/*.(ts|tsx|js)', '**/*.(test|spec).(ts|tsx|js)'],
  collectCoverageFrom: [
    'packages/*/src/**/*.{ts,tsx}',
    'apps/desktop/src/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/coverage/**',
  ],
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  transformIgnorePatterns: ['/node_modules/'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  testTimeout: 10000,
  maxWorkers: '50%',
}
