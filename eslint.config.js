const eslint = require('@eslint/js');
const tseslint = require('typescript-eslint');
const angulareslint = require('angular-eslint');
const rxjsX = require('eslint-plugin-rxjs-x');

module.exports = tseslint.config(
  {
    ignores: ['**/node_modules/**', '**/dist/**', '**/*.spec.ts']
  },
  {
    // recommended rules for TypeScript files
    files: ['**/*.ts'],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.app.json', './projects/formz/tsconfig.lib.json'] // enable type-aware linting
      }
    },
    plugins: {
      'rxjs-x': rxjsX
    },
    extends: [
      eslint.configs.recommended,
      // recommended rules for TypeScript
      ...tseslint.configs.recommended,
      ...tseslint.configs.stylistic,
      // recommended rules for Angular
      ...angulareslint.configs.tsRecommended
    ],
    // set the custom processor which allows to have inline component templates extracted
    // and treated as if they are HTML files (and therefore have the .html config below applied to them)
    processor: angulareslint.processInlineTemplates,
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          args: 'all',
          argsIgnorePattern: '^_',
          caughtErrors: 'all',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          ignoreRestSiblings: true
        }
      ],
      'rxjs-x/finnish': [
        'error',
        {
          functions: true,
          methods: true,
          names: {
            '^canActivate$': false,
            '^canLoad$': false,
            '^intercept$': false,
            '^resolve$': false,
            '^validate$': false
          },
          parameters: true,
          properties: true,
          strict: false,
          types: {
            '^EventEmitter$': false
          },
          variables: true
        }
      ]
    }
  },
  {
    // recommended rules for HTML files
    // - external Angular template files
    // - inline Angular templates require processor above
    files: ['**/*.html'],
    extends: [
      // recommended Angular template rules
      ...angulareslint.configs.templateRecommended
      // ...angulareslint.configs.templateAccessibility
    ],
    rules: {}
  },
  {
    files: ['projects/formz/src/lib/**/*.ts'],
    rules: {
      '@angular-eslint/component-selector': [
        'error',
        {
          type: 'element',
          prefix: 'formz',
          style: 'kebab-case'
        }
      ],
      '@angular-eslint/directive-selector': [
        'error',
        {
          type: 'attribute',
          prefix: 'formz',
          style: 'camelCase'
        }
      ]
    }
  }
);
