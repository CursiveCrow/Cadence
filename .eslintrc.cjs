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
    'packages/*/src/**/*.d.ts',
    'packages/*/src/**/*.d.ts.map',
    'packages/*/src/**/*.js',
    'packages/*/src/**/*.js.map',
  ],
  rules: {
    // Reasonable defaults; adjust as needed
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'off',
    'no-extra-semi': 'off',
    'no-console': 'off',
    'no-empty': ['error', { 'allowEmptyCatch': true }],
    'no-constant-condition': 'off',
    'prefer-const': 'warn',
  },
  overrides: [
    {
      files: ['packages/*/src/**/*.{ts,tsx}'],
      excludedFiles: [
        'packages/*/src/**/__tests__/**',
        'packages/*/src/**/*.{test,spec}.{ts,tsx}',
        'packages/*/src/stories/**'
      ],
      parserOptions: {
        project: ['packages/*/tsconfig.json']
      }
    },
    {
      files: ['packages/ui/**/*.{ts,tsx}'],
      extends: ['plugin:storybook/recommended']
    }
  ]
}
