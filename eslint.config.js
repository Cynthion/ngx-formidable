const eslint = require('@eslint/js');
const tseslint = require('typescript-eslint');
const angulareslint = require('angular-eslint');
const rxjsX = require('eslint-plugin-rxjs-x').default;

module.exports = tseslint.config(
  {
    ignores: ['**/node_modules/**', '**/dist/**', '**/*.spec.ts']
  },
  {
    // recommended rules for TypeScript files
    files: ['**/*.ts'],
    languageOptions: {
      parserOptions: {
        // Type-aware linting. `tsconfig.spec.json` is here for the sources only a spec reaches — the specs
        // themselves are ignored above, but the modules they import still have to belong to a project.
        project: ['./tsconfig.app.json', './tsconfig.spec.json', './projects/ngx-formidable/tsconfig.lib.json']
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
    files: ['projects/ngx-formidable/src/lib/**/*.ts'],
    rules: {
      '@angular-eslint/component-selector': [
        'error',
        {
          type: 'element',
          prefix: 'formidable',
          style: 'kebab-case'
        }
      ],
      '@angular-eslint/directive-selector': [
        'error',
        {
          type: 'attribute',
          prefix: 'formidable',
          style: 'camelCase'
        }
      ]
    }
  },
  {
    files: ['src/app/portal/**/*.ts'],
    rules: {
      '@angular-eslint/component-selector': [
        'error',
        {
          type: 'element',
          prefix: 'portal',
          style: 'kebab-case'
        }
      ],
      '@angular-eslint/directive-selector': [
        'error',
        {
          type: 'attribute',
          prefix: 'portal',
          style: 'camelCase'
        }
      ]
    }
  }
);
