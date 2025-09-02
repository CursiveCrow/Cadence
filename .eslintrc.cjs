/* Root ESLint configuration for this app */
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
    tsconfigRootDir: __dirname,
  },
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  ignorePatterns: [
    '**/dist/**',
    '**/dist-electron/**',
    '**/build/**',
    '**/release/**',
    '**/coverage/**',
    '**/node_modules/**',
  ],
  rules: {
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'off',
    'no-extra-semi': 'off',
    'no-console': 'off',
    'no-empty': ['error', { allowEmptyCatch: true }],
    'no-constant-condition': 'off',
    'prefer-const': 'warn',
  },
}
