import js from '@eslint/js';
import globals from 'globals';
import { defineConfig, globalIgnores } from 'eslint/config';
import { commonRules, defaultIgnores, unusedIgnore } from './shared.js';

/** Plain Node ESM/CJS JavaScript services (jest globals in tests). */
export function nodeJs({ ignores = [] } = {}) {
  return defineConfig([
    globalIgnores([...defaultIgnores, ...ignores]),
    js.configs.recommended,
    {
      files: ['**/*.{js,mjs}'],
      languageOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        globals: { ...globals.node },
      },
      rules: {
        ...commonRules,
        'no-unused-vars': ['warn', unusedIgnore],
      },
    },
    {
      files: ['**/*.cjs'],
      languageOptions: {
        ecmaVersion: 2022,
        sourceType: 'commonjs',
        globals: { ...globals.node },
      },
    },
    {
      files: ['tests/**/*.{js,mjs}', '**/*.test.js'],
      languageOptions: {
        globals: { ...globals.jest },
      },
    },
  ]);
}
