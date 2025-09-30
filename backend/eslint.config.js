import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
        global: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
      },
    },
    rules: {
      // Security Rules
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-process-exit': 'error',

      // Code Quality Rules
      'no-console': 'off', // Allowed in backend
      'no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],
      'no-debugger': 'error',
      'no-var': 'error',
      'prefer-const': 'error',
      'eqeqeq': ['error', 'always'],
      'curly': ['error', 'all'],

      // Node.js Specific
      'no-path-concat': 'error',
      'handle-callback-err': 'error',
      'no-mixed-requires': 'error',
      'no-new-require': 'error',
    },
  },
  {
    ignores: [
      'node_modules/**',
      '*.config.js',
    ],
  },
];