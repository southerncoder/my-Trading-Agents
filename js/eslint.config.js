import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import globals from 'globals';

export default [
  // Base recommended rules
  js.configs.recommended,
  
  // TypeScript files configuration
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: typescriptParser,
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
      '@typescript-eslint': typescript,
    },
    rules: {
      // Disable base rule and enable TypeScript version
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      
      // Other rules from our previous config
      'no-console': 'warn',
      'no-debugger': 'error',
      'prefer-const': 'error',
      'no-var': 'error',
      'eqeqeq': ['error', 'always'],
    },
  },
  
  // CLI files override (allow console)
  {
    files: ['src/cli/**/*.ts'],
    rules: {
      'no-console': 'off',
    },
  },
  
  // Ignore patterns
  {
    ignores: [
      'dist/',
      'node_modules/',
      '*.js',
      '*.d.ts',
      'tests/',
      'debugScripts/',
      'coverage/',
    ],
  },
];