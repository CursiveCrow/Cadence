/* Root ESLint configuration for the Cadence monorepo */
module.exports = {
  root: true,
  env: {
    es2021: true,
    browser: true,
    node: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  ignorePatterns: [
    '**/dist/**',
    '**/dist-electron/**',
    '**/build/**',
    '**/release/**',
    '**/coverage/**',
    '**/node_modules/**',
  ],
  rules: {
    // Reasonable defaults; adjust as needed
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'off',
    'no-extra-semi': 'off',
    'no-console': 'off',
  },
}


