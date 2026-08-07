# Architecture

Structure of the `ngx-formidable` workspace — a publishable Angular library plus a demo app. For coding conventions see `conventions.md`; for the component/directive catalogue see `ui_components.md`.

## Workspace Structure

```txt
ngx-formidable/
├── projects/ngx-formidable/   # the publishable library (ng-packagr) → @cynthion/ngx-formidable
├── src/                       # the demo app (GitHub Pages showcase + dev playground)
├── dist/                      # build output (dist/ngx-formidable is the published package)
├── .documentation/            # contributor docs (see README.md)
└── .github/workflows/         # deploy.yml — GitHub Pages deploy of the demo
```

Two Angular projects are declared: the `ngx-formidable` library (`projectType: library`, ng-packagr builder) and the `ngx-formidable-demo` application (root project, sources under `src/`). The demo resolves the library through the `tsconfig.json` path alias `ngx-formidable` → the library's `public-api.ts`.

## Library

The library source lives under `projects/ngx-formidable/src/lib/`. Everything public is re-exported from `public-api.ts` (the ng-packagr entry point).

```txt
lib/
├── components/
│   ├── fields/          # the field components, each a folder (.ts/.html/.scss) + base-field.directive.ts
│   ├── field-decorator/ # wraps a field with label, adornment, prefix, suffix, errors
│   ├── field-errors/    # renders validation errors
│   ├── field-option/    # a single option inside option-based fields
│   └── icon/            # inline SVG icon
├── directives/          # form-level + field-decoration directives
├── helpers/             # pure functions: mask, input, format, form, form-validate, position, option, utility
├── models/              # formidable.model.ts (interfaces, tokens, constants), utility-types.ts, icons.ts
├── styles/              # SCSS tokens, the :root CSS-variable block, field mixins
├── ngx-formidable.module.ts     # NgxFormidableModule — aggregates all standalone pieces (NgModule path)
└── provide-ngx-formidable.ts    # provideNgxFormidable() — provider function (standalone path)
```

**Composition Model**: field components implement `ControlValueAccessor` and register the `FORMIDABLE_FIELD` token; `FieldDecoratorComponent` projects a field plus its label/adornment/prefix/suffix/errors; option-based fields collect `FieldOptionComponent` children via `@ContentChildren`. The abstract `BaseFieldDirective` is the shared base and the extension point for custom fields. See `ui_components.md`.

**Validation**: `NgxFormidableFormDirective` bridges Angular template-driven forms to Vest static suites, exposing errors/validity as observables and producing async validators per field path.

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

ng-packagr config (`ng-package.json`) sets the entry file to `public-api.ts`, outputs to `dist/ngx-formidable`, and ships the library SCSS as assets under `dist/ngx-formidable/styles/`. The package is published as `@cynthion/ngx-formidable` to GitHub Packages (`publishConfig.registry`). Note the rough edge: `publish:lib` still passes `--access public`, which is a public-npm flag — reconcile it with the GitHub Packages registry when finalizing the release flow.

## Consumer Setup

Consumers wire the library once, then import the standalone components (or `NgxFormidableModule`) where used:

- **Standalone**: `provideNgxFormidable(config?)` in `app.config.ts`.
- **NgModule**: `NgxFormidableModule.forRoot(config?)` in the root module.

Both register ngx-mask and the mask-defaults token; the `config` accepts `globalMaskConfig`. Styling is imported separately — see `conventions.md`.

## Key Paths

| Path                                                 | Purpose                                                          |
| :--------------------------------------------------- | :--------------------------------------------------------------- |
| `projects/ngx-formidable/src/lib/`                   | Library source (components, directives, helpers, models, styles) |
| `projects/ngx-formidable/src/public-api.ts`          | Public API — everything the package exports                      |
| `projects/ngx-formidable/src/lib/components/fields/` | Field components (extend `BaseFieldDirective`)                   |
| `projects/ngx-formidable/src/lib/styles/`            | SCSS tokens, `:root` CSS-variable block, field mixins            |
| `src/app/`                                           | Demo app (GitHub Pages showcase, dev playground)                 |
| `dist/ngx-formidable/`                               | ng-packagr output — the published package                        |
