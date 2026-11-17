// Rules and ignores common to every preset. Kept identical to what the services had before
// the presets existed, so lint counts do not move when a service switches over.

export const defaultIgnores = ['dist/', 'node_modules/', 'coverage/', 'logs/'];

/** Style and safety rules shared by JS and TS presets. */
export const commonRules = {
  'preserve-caught-error': 'warn',
  'no-case-declarations': 'warn',
  'no-useless-escape': 'warn',
  'prefer-const': 'error',
  'no-var': 'error',
  eqeqeq: ['error', 'always'],
};

export const unusedIgnore = {
  argsIgnorePattern: '^_',
  varsIgnorePattern: '^_',
  caughtErrorsIgnorePattern: '^_',
};
