// Minimal ESLint flat config (ESLint v9+)
export default [
  {
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console': 'off',
    },
    ignores: ['dist/**', 'node_modules/**', 'coverage/**'],
  },
];
