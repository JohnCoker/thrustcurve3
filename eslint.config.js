'use strict';

const js = require('@eslint/js'),
      globals = require('globals');

module.exports = [
  {
    ignores: [
      'api/',
      'mobile/',
      'tmp/',
      'logs/',
      '**/out/',
      'playwright-report/',
      'test-results/',
      'public/**',
      '!public/javascripts/main.js',
    ],
  },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
      globals: globals.node,
    },
    rules: {
      'no-unused-vars': ['warn', { args: 'none', caughtErrors: 'none' }],
      'no-prototype-builtins': 'warn',
      'no-useless-escape': 'warn',
      'no-useless-assignment': 'warn',
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
  {
    files: ['**/spec/**/*.js'],
    languageOptions: {
      globals: globals.jasmine,
    },
  },
  {
    files: ['public/javascripts/main.js'],
    languageOptions: {
      sourceType: 'script',
      globals: { ...globals.browser, ...globals.jquery },
    },
  },
];
