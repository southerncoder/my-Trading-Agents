import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default [
  // Base recommended rules
  js.configs.recommended,
  
  // TypeScript files configuration
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
      },
      globals: {
        ...globals.node,
        ...globals.es2022,
        NodeJS: 'readonly'
      },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
    },
    rules: {
      // Disable base rule and enable TypeScript version
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_'
      }],
      
      // Other rules from our previous config
      'no-console': 'warn',
      'no-debugger': 'error',
      'prefer-const': 'error',
      'no-var': 'error',
      'eqeqeq': ['error', 'always'],
      // TypeScript itself checks undefined identifiers and overload declarations
      'no-undef': 'off',
      'no-case-declarations': 'warn',
      'no-prototype-builtins': 'warn',
      'no-useless-escape': 'warn',
      'no-async-promise-executor': 'warn',
      'no-redeclare': 'off',
      // New in ESLint 10 recommended; warn until the existing catch blocks are cleaned up
      'preserve-caught-error': 'warn',
      'no-useless-assignment': 'warn',
    },
  },
  
  // CLI files override (allow console)
  {
    files: ['src/cli/**/*.ts'],
    rules: {
      'no-console': 'off',
    },
  },
  
  // Test files override (allow console and unused vars for testing)
  {
    files: ['src/tests/**/*.ts'],
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
  
  // DataFlow files override (allow console for debugging and unused vars)
  {
    files: ['src/dataflows/**/*.ts'],
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
  
  // Graph experiment files override (allow console and unused vars)
  {
    files: ['src/graph/langgraph-*.ts', 'src/test-graph.ts'],
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
  
  // Quality and monitoring files override (allow console and unused vars)
  {
    files: ['src/quality/**/*.ts', 'src/monitoring/**/*.ts', 'src/performance/**/*.ts'],
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
  
  // Provider files override (allow unused vars for interface compliance)
  {
    files: ['src/providers/**/*.ts'],
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
  
  // Utils files override (allow unused vars for utility functions)
  {
    files: ['src/utils/**/*.ts'],
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
  
  // Debug scripts override (allow console and Node globals)
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
    rules: {
      'no-console': 'off',
    },
  },
  
  // Ignore patterns
  {
    ignores: [
      'dist/',
      'node_modules/',
      '*.d.ts',
      'coverage/',
      'secrets/',
      // Pre-existing files with syntax damage / undefined references; need rewriting
      'tests/langgraph/test-enhanced-graph-production.js',
      'tests/production/test-comprehensive-production.js',
      'scripts/fix-compiled-imports.js',
      'examples/memory/test-advanced-memory-complete-system.js',
    ],
  },
  
  // JavaScript files configuration (scripts, tests)
  {
    files: ['**/*.{js,mjs,cjs}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.es2022,
      },
    },
    rules: {
      'no-console': 'off', // Allow console in scripts and tests
      'no-async-promise-executor': 'warn',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],'no-useless-escape': 'warn',
      'preserve-caught-error': 'warn',
      'no-useless-assignment': 'warn',
    },
  },

  // Test files (jest/vitest style globals)
  {
    files: ['**/*.test.ts', 'tests/**/*.ts'],
    languageOptions: {
      globals: {
        ...globals.jest,
      },
    },
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
];
