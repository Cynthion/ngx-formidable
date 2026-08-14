# Architecture

Structure of the `ngx-formidable` repository:
— a publishable Angular library

- a demo app

For coding conventions see `conventions.md`; for the component/directive catalogue see `ui_components.md`.

## Repository Structure

```txt
ngx-formidable/
├── projects/ngx-formidable/   # the publishable library → @cynthion/ngx-formidable
├── src/                       # the demo app
├── dist/                      # build output
├── .documentation/            # contributor docs
└── .github/workflows/         # deploy.yml — GitHub Pages deploy of the demo
```

Two Angular projects are declared:

- `ngx-formidable` library
- `ngx-formidable-demo` application

## Library

The library ships two entry points. The primary source lives under `projects/ngx-formidable/src/lib/`; everything public is re-exported from `public-api.ts`.

```txt
projects/ngx-formidable/
├── src/                                  # → @cynthion/ngx-formidable
│   └── lib/
│       ├── components/
│       │   ├── field-decorator/          # wraps a field with label, adornment, prefix, suffix, hints, errors
│       │   ├── field-errors/             # renders validation errors
│       │   ├── field-option/             # a single option inside option-based fields
│       │   └── fields/                   # field components, base directives
│       ├── directives/                   # field-decoration directives
│       ├── forms/                        # the form-level directives and their helpers
│       ├── helpers/                      # pure functions: mask, input, format, position, option, utility
│       ├── models/                       # formidable.model.ts (UI), validation.model.ts (the validation seam), utility-types.ts
│       ├── styles/                       # SCSS tokens, the :root CSS-variable block, field mixins
│       ├── ngx-formidable.module.ts.     # NgxFormidableModule (NgModule path)
│       └── provide-ngx-formidable.ts.    # provideNgxFormidable() (standalone path)
└── vest/                                 # → @cynthion/ngx-formidable/vest — the Vest adapter, `vest` as an optional peer
```

**Composition Model**: field components implement `ControlValueAccessor` and register the `FORMIDABLE_FIELD` token; `FieldDecoratorComponent` projects a field plus its label/adornment/prefix/suffix/errors; option-based fields collect `FieldOptionComponent` children via `@ContentChildren`. The abstract `BaseFieldDirective` is the shared base and the extension point for custom fields; the abstract `BaseOptionFieldDirective` extends it for the four fields that walk an option list with a highlight. See `ui_components.md`.

**Validation**:

- `NgxFormidableFormDirective` owns the model, the targets and the debouncing, then delegates the rules to whatever `FORMIDABLE_VALIDATOR` is provided; errors surface through Angular's own `AbstractControl.errors`.
- The Vest validator is the second entry point, and Angular's built-in validators work with nothing wired at all.

See `tech/validation.md` and `user/validation.md`.

## Demo App

The demo (`src/`) is a standalone-bootstrapped app that showcases every field and serves as the dev playground; `example-form` is the main showcase and `example-custom-color-picker` demonstrates building a custom field on `BaseFieldDirective`. It is deployed to GitHub Pages by `deploy.yml` on push to `main` (builds and publishes `dist/ngx-formidable-demo`). The demo consumes the library, not the other way round.

## Build And Publish

| Script         | Purpose                                                       |
| :------------- | :------------------------------------------------------------ |
| `start`        | Serve the demo app                                            |
| `build`        | Build the demo app                                            |
| `build:lib`    | Build the library with ng-packagr into `dist/ngx-formidable`  |
| `prebuild:lib` | Copy `README.md` + `LICENSE` into the library before building |
| `publish:lib`  | Publish the built library                                     |
| `test`         | Run tests (see `testing.md`)                                  |

ng-packagr config:

- `ng-package.json` sets the entry file to `public-api.ts`, outputs to `dist/ngx-formidable`, and ships the library SCSS as assets under `dist/ngx-formidable/styles/`.
- `vest/ng-package.json` declares the secondary entry point; ng-packagr builds it after the primary and it imports the primary by package name (see `tech/validation.md`). The package is published as `@cynthion/ngx-formidable` to GitHub Packages (`publishConfig.registry`).

## Consumer Setup

Consumers wire the library once, then import the standalone components (or `NgxFormidableModule`) where used:

- **Standalone**: `provideNgxFormidable(config?)` in `app.config.ts`.
- **NgModule**: `NgxFormidableModule.forRoot(config?)` in the root module.

Both register ngx-mask and the mask-defaults token; the `config` accepts `globalMaskConfig`. Styling is imported separately — see `conventions.md`.

## Key Paths

| Path                                                 | Purpose                                                                 |
| :--------------------------------------------------- | :---------------------------------------------------------------------- |
| `projects/ngx-formidable/src/lib/`                   | Library source (components, directives, forms, helpers, models, styles) |
| `projects/ngx-formidable/src/public-api.ts`          | Public API — everything the package exports                             |
| `projects/ngx-formidable/src/lib/components/fields/` | Field components                                                        |
| `projects/ngx-formidable/src/lib/forms/`             | The form-level directives and the `FORMIDABLE_VALIDATOR` boundary       |
| `projects/ngx-formidable/src/lib/styles/`            | SCSS tokens, `:root` CSS-variable block, field mixins                   |
| `projects/ngx-formidable/vest/`                      | The Vest adapter, `@cynthion/ngx-formidable/vest`                       |
| `src/app/`                                           | Demo app                                                                |
| `dist/ngx-formidable/`                               | ng-packagr output                                                       |
