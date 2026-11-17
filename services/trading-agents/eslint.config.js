import globals from 'globals';
import { nodeTs } from '../eslint-config/node-ts.js';

// Shared Node/TS preset (services/eslint-config) plus this service's own relaxations.
// recommendedTs: false keeps typescript-eslint's recommended rule set off, as before the shared config.
export default [
  ...nodeTs({
    recommendedTs: false,
    ignores: [
      '*.d.ts',
      'secrets/',
    ],
  }),

  // TypeScript files: rules specific to this service
  {
    files: ['**/*.ts'],
    languageOptions: {
      parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
      globals: { ...globals.es2022, NodeJS: 'readonly' },
    },
    rules: {
      'no-console': 'warn',
      'no-debugger': 'error',
      // TypeScript itself checks undefined identifiers and overload declarations
      'no-undef': 'off',
      'no-prototype-builtins': 'warn',
      'no-async-promise-executor': 'warn',
      'no-redeclare': 'off',
      // New in ESLint 10 recommended; warn until the existing catch blocks are cleaned up
      'no-useless-assignment': 'warn',
    },
  },

  // Per-folder relaxations
  { files: ['src/cli/**/*.ts'], rules: { 'no-console': 'off' } },
  {
    // tests, dataflows, graph experiments, quality/monitoring/performance: console and unused vars allowed
    files: [
      'src/tests/**/*.ts',
      'src/dataflows/**/*.ts',
      'src/graph/langgraph-*.ts',
      'src/test-graph.ts',
      'src/quality/**/*.ts',
      'src/monitoring/**/*.ts',
      'src/performance/**/*.ts',
    ],
    rules: { 'no-console': 'off', '@typescript-eslint/no-unused-vars': 'off' },
  },
  {
    // interface compliance / utility functions: unused vars allowed
    files: ['src/providers/**/*.ts', 'src/utils/**/*.ts'],
    rules: { '@typescript-eslint/no-unused-vars': 'off' },
  },

  // Debug scripts (allow console and Node globals)
  {
    files: ['debugScripts/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.node,
        console: 'readonly',
        process: 'readonly',
        fetch: 'readonly',
        AbortSignal: 'readonly',
      },
    },
    rules: { 'no-console': 'off' },
  },

  // JavaScript files (scripts, tests)
  {
    files: ['**/*.{js,mjs,cjs}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.node, ...globals.es2022 },
    },
    rules: {
      'no-console': 'off', // Allow console in scripts and tests
      'no-async-promise-executor': 'warn',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-useless-escape': 'warn',
      'preserve-caught-error': 'warn',
      'no-useless-assignment': 'warn',
    },
  },

  // Test files (jest/vitest style globals)
  {
    files: ['**/*.test.ts', 'tests/**/*.ts'],
    languageOptions: { globals: { ...globals.jest } },
    rules: { 'no-console': 'off', '@typescript-eslint/no-unused-vars': 'off' },
  },
];
