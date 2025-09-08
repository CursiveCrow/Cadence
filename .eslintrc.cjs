<<<<<<< HEAD
/* Root ESLint configuration for this app */
=======
/**
 * Root ESLint configuration enforcing MVVM boundaries.
 */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: [],
  overrides: [
    {
      files: ['packages/view/src/**/*.{ts,tsx}'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            paths: [
              { name: '@cadence/model', message: 'Views must not import Model' },
              { name: '@cadence/repositories', message: 'Views must not import Repositories' },
              {
                name: '@cadence/repositories/src/yjs',
                message: 'Views must not import Repository implementations',
              },
              {
                name: '@cadence/repositories/src/memory',
                message: 'Views must not import Repository implementations',
              },
              {
                name: '@cadence/renderer',
                message: 'Views must import renderer via @cadence/renderer/react only',
              },
              { name: '@cadence/crdt', message: 'Views must not import CRDT' },
              {
                name: '@cadence/platform-services',
                message: 'Views must not import Platform Services',
              },
              { name: 'electron', message: 'Views must not import Electron modules' },
            ],
          },
        ],
      },
    },
    {
      files: ['packages/viewmodel/src/**/*.{ts,tsx}'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            paths: [
              { name: '@cadence/view', message: 'ViewModels must not import Views' },
              { name: '@cadence/renderer', message: 'ViewModels must not import Renderer engine' },
              {
                name: '@cadence/renderer/react',
                message: 'ViewModels must not import Renderer React adapter',
              },
              { name: '@cadence/crdt', message: 'ViewModels must not import CRDT' },
              { name: 'electron', message: 'ViewModels must not import Electron modules' },
            ],
          },
        ],
      },
    },
    {
      files: ['packages/model/src/**/*.{ts,tsx}'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            paths: [
              { name: 'react', message: 'Model must not import React' },
              { name: 'react-dom', message: 'Model must not import ReactDOM' },
              { name: 'react-redux', message: 'Model must not import React Redux' },
              {
                name: '@cadence/repositories/src/yjs',
                message: 'Model must not import Repository implementations',
              },
              {
                name: '@cadence/repositories/src/memory',
                message: 'Model must not import Repository implementations',
              },
              { name: '@cadence/renderer', message: 'Model must not import Renderer engine' },
              {
                name: '@cadence/renderer/react',
                message: 'Model must not import Renderer React adapter',
              },
              { name: 'electron', message: 'Model must not import Electron modules' },
            ],
          },
        ],
      },
    },
  ],
}

/* Root ESLint configuration for the Cadence monorepo */
>>>>>>> main
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
<<<<<<< HEAD
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
=======
    // Reasonable defaults; adjust as needed
    '@typescript-eslint/no-unused-vars': [
      'warn',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
>>>>>>> main
    '@typescript-eslint/no-explicit-any': 'off',
    'no-extra-semi': 'off',
    'no-console': 'off',
    'no-empty': ['error', { allowEmptyCatch: true }],
    'no-constant-condition': 'off',
    'prefer-const': 'warn',
  },
<<<<<<< HEAD
=======
  overrides: [
    {
      files: ['packages/*/src/**/*.{ts,tsx}'],
      excludedFiles: [
        'packages/*/src/**/__tests__/**',
        'packages/*/src/**/*.{test,spec}.{ts,tsx}',
        'packages/*/src/stories/**',
      ],
      parserOptions: {
        project: ['packages/*/tsconfig.json'],
      },
    },
    {
      files: ['packages/ui/**/*.{ts,tsx}'],
      extends: ['plugin:storybook/recommended'],
    },
  ],
>>>>>>> main
}
