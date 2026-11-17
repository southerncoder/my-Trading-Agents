import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import { defineConfig, globalIgnores } from 'eslint/config';
import { commonRules, defaultIgnores, unusedIgnore } from './shared.js';

/**
 * Node TypeScript services.
 * recommendedTs: false skips typescript-eslint's recommended rule set and keeps only the parser and
 * plugin (trading-agents has not been brought up to that bar yet; it turns the base no-unused-vars
 * off itself).
 */
export function nodeTs({ ignores = [], recommendedTs = true } = {}) {
  return defineConfig([
    globalIgnores([...defaultIgnores, ...ignores]),
    js.configs.recommended,
    ...(recommendedTs ? [tseslint.configs.recommended] : []),
    {
      files: ['**/*.ts'],
      ...(recommendedTs ? {} : { plugins: { '@typescript-eslint': tseslint.plugin } }),
      languageOptions: {
        ...(recommendedTs ? {} : { parser: tseslint.parser }),
        globals: { ...globals.node },
      },
      rules: {
        ...commonRules,
        '@typescript-eslint/no-unused-vars': ['warn', unusedIgnore],
        ...(recommendedTs
          ? {
              '@typescript-eslint/no-unsafe-function-type': 'warn',
              '@typescript-eslint/no-explicit-any': 'warn',
            }
          : { 'no-unused-vars': 'off' }),
      },
    },
  ]);
}
