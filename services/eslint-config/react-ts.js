import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import { defineConfig, globalIgnores } from 'eslint/config';
import { defaultIgnores, unusedIgnore } from './shared.js';

/** Vite + React + TypeScript browser apps. */
export function reactTs({ ignores = [] } = {}) {
  return defineConfig([
    globalIgnores([...defaultIgnores, ...ignores]),
    {
      files: ['**/*.{ts,tsx}'],
      extends: [
        js.configs.recommended,
        tseslint.configs.recommended,
        reactHooks.configs.flat.recommended,
        reactRefresh.configs.vite,
      ],
      languageOptions: {
        ecmaVersion: 2022,
        globals: { ...globals.browser },
      },
      rules: {
        'preserve-caught-error': 'warn',
        'no-case-declarations': 'warn',
        'no-useless-escape': 'warn',
        'react-hooks/set-state-in-effect': 'warn',
        'react-hooks/immutability': 'warn',
        'react-refresh/only-export-components': 'warn',
        '@typescript-eslint/no-unused-vars': ['warn', unusedIgnore],
        '@typescript-eslint/no-explicit-any': 'warn',
      },
    },
  ]);
}
