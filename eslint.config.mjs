// US-0506 NFR8.3: ESLint in CI; a finding blocks the merge. Smallest rule set that catches real errors (plan K3).
import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import prettier from 'eslint-config-prettier';

export default [
  {
    ignores: [
      'out/**',
      'dist/**',
      'build/**',
      'coverage/**',
      'node_modules/**',
      'aidlc/**',
      '.claude/**',
      '.aidlc/**',
      '.opencode/*', // AI-DLC's opencode files; the app's own plugin folder stays linted
      '!.opencode/plugins/',
      'docs/**',
      'tests/fixtures/**',
      'tests/.tmp/**'
    ]
  },
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx,mjs,cjs}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } }
    },
    plugins: { react, 'react-hooks': reactHooks },
    rules: {
      'no-empty': ['error', { allowEmptyCatch: true }],
      'react/jsx-uses-vars': 'error',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn'
    }
  },
  {
    files: ['src/main/**', 'src/preload/**', 'src/shared/**', 'tests/main/**', 'tests/helpers/**', 'scripts/**', '.opencode/plugins/**', '*.{js,mjs,cjs}'],
    languageOptions: { globals: { ...globals.node } }
  },
  {
    files: ['src/renderer/**', 'src/shared/**', 'tests/renderer/**'],
    languageOptions: { globals: { ...globals.browser } }
  },
  {
    // The renderer tests run under vitest in Node with jsdom, so they read process and __dirname too.
    files: ['tests/renderer/**'],
    languageOptions: { globals: { ...globals.node } }
  },
  {
    files: ['**/*.cjs'],
    languageOptions: { sourceType: 'commonjs' }
  },
  prettier
];
