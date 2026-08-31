// Flat config (ESLint 9). This package is two JS files and a stylesheet, so
// the recommended preset is the whole rule set — anything more would be taste
// with a maintenance cost. The point of the gate is that it CAN fail.
import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['node_modules/**', 'fonts/**'] },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'commonjs',
      globals: { ...globals.node },
    },
  },
];
