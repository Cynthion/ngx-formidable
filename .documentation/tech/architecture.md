# Architecture

Structure of the `ngx-formidable` repository: a publishable Angular library and the portal that showcases it.

For coding conventions see `impl/conventions.md`; for the component/directive catalogue see `user/components.md`.

## Repository Structure

```txt
ngx-formidable/
├── projects/ngx-formidable/   # the publishable library → @cynthion/ngx-formidable
├── src/                       # the portal
├── dist/                      # build output
├── .documentation/            # docs: user/ for consumers, tech/ for maintainers, impl/ for repo work
└── .github/workflows/         # checks, the GitHub Pages deploy of the portal, the dependency check
```

Two Angular projects are declared:

- `ngx-formidable` library
- `ngx-formidable-portal` application

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

**Composition Model**: field components implement `ControlValueAccessor` and register the `FORMIDABLE_FIELD` token; `FieldDecoratorComponent` projects a field plus its label/adornment/prefix/suffix/errors; option-based fields collect `FieldOptionComponent` children via `@ContentChildren`. The abstract `BaseFieldDirective` is the shared base and the extension point for custom fields; the abstract `BaseOptionFieldDirective` extends it for the four fields that walk an option list with a highlight. See `user/components.md`.

**Validation**:

- `NgxFormidableFormDirective` owns the model, the targets and the debouncing, then delegates the rules to whatever `FORMIDABLE_VALIDATOR` is provided; errors surface through Angular's own `AbstractControl.errors`.
- The Vest validator is the second entry point, and Angular's built-in validators work with nothing wired at all.

See `tech/validation.md` and `user/validation.md`.

## Portal

The portal (`src/`) is a standalone-bootstrapped application that showcases every field and serves as the dev playground. Its `/` route is the Studio and its `/docs` route mirrors `user/*.md`; `impl/portal.md` is its design and `user/studio.md` the consumer's guide to it. It is deployed to GitHub Pages by `deploy.yml` on push to `main` (builds and publishes `dist/ngx-formidable-portal`). The portal consumes the library, not the other way round.

The portal lives in `src/app/portal/` and is routed with hash location, because GitHub Pages serves no SPA fallback. Its design is `impl/portal.md`.

| Path                  | Holds                                                                           |
| :-------------------- | :------------------------------------------------------------------------------ |
| `portal/model/`       | The field specifications, the capability table, the token manifest, the schemes |
| `portal/state/`       | The three signal stores: form definition, model, theme                          |
| `portal/stage/`       | The preview form, the model drawer and the accessibility readout                |
| `portal/inspector/`   | The theme editor, the field editor and the structure editor                     |
| `portal/export/`      | Theme export and import, and the markup serializer and parser                   |
| `src/styles/portal/`  | The portal's own appearance, the chrome insulation and the shared controls      |
| `src/app/example-*`   | The custom field, option, icon and tooltip the portal projects                  |
| `src/app/validation/` | The hand-written model and Vest suite the validation integration spec drives    |

**Mirrored Documentation**: the `Docs` route imports `.documentation/user/*.md` as text — `angular.json` maps `.md` to esbuild's `text` loader for the application and the test target — and renders it with `marked`. The markdown is the single source: there is no second copy to drift, and the deploy stays static because nothing is fetched. `docs:check` still guards the token manifest, whose descriptions the **inspector** reads for inline help.

**Chrome Insulation**: the portal's own controls read `--formidable-*`, and the user's theme is written to `:root`, so the chrome would follow it. It cannot be insulated by scoping alone — most of the library's variables are derived and declared once, in that `:root` block, so an override further down the tree leaves the derived ones frozen. The chrome therefore re-emits the whole default block under `.portal-chrome`, where derivation recomputes against its own bases. That is what the `formidable-vars` mixin in `_formidable-vars.scss` exists for; it is not forwarded from `_ngx-formidable.scss`, so the closed SCSS surface is unchanged.

## Build And Publish

| Script         | Purpose                                                                 |
| :------------- | :---------------------------------------------------------------------- |
| `start`        | Serve the portal                                                        |
| `build`        | Build the portal                                                        |
| `build:lib`    | Build the library with ng-packagr into `dist/ngx-formidable`            |
| `docs:check`   | Hold the portal's token manifest in step with `user/theme-reference.md` |
| `prebuild:lib` | Copy `README.md` + `LICENSE` into the library before building           |
| `publish:lib`  | Publish the built library                                               |
| `test`         | Run tests (see `impl/testing.md`)                                       |

ng-packagr config:

- `ng-package.json` sets the entry file to `public-api.ts`, outputs to `dist/ngx-formidable`, and ships the library SCSS as assets under `dist/ngx-formidable/styles/`.
- `vest/ng-package.json` declares the secondary entry point; ng-packagr builds it after the primary and it imports the primary by package name (see `tech/validation.md`). The package is published as `@cynthion/ngx-formidable` to GitHub Packages (`publishConfig.registry`).

## Continuous Integration

Three workflows in `.github/workflows/`. All three take the Node version from `.nvmrc` and install with `npm ci`, so a run resolves exactly the committed lockfile.

| Workflow               | Trigger                              | Does                                                                               |
| :--------------------- | :----------------------------------- | :--------------------------------------------------------------------------------- |
| `ci.yml`               | Push to `main`, pull request, manual | `prettier:check`, `lint`, `style-lint`, `build:lib`, both test projects, `build`   |
| `deploy.yml`           | Push to `main`, manual               | Builds the portal and deploys `dist/ngx-formidable-portal/browser` to GitHub Pages |
| `dependency-check.yml` | Monthly, manual                      | Reports `npm outdated` and `ng update` into a GitHub issue                         |

- **Checks Mirror The Scripts**: `ci.yml` runs the same scripts a contributor runs locally, in the order of the Definition of Done in `impl/conventions.md`. `build:lib` is in it because it is also the type and template check — there is no standalone typecheck script.
- **Tests**: the two projects are separate steps, because `ng test` takes one project at a time. Both run in `ChromeHeadless` with `--watch=false`.
- **Dependency Check**: the reports are read-only and the issue is the notification, so it opens one only when something is behind and only when no open `dependencies` issue is already waiting. Editing an open issue would not notify, which is why the check never does.

## Consumer Setup

Two wiring paths, `provideNgxFormidable()` and `NgxFormidableModule.forRoot()`, differing only in how they are registered: both return the same providers, so neither is the primary. Styling is imported separately, because it is a stylesheet and not a provider. The steps a consumer follows are in `user/getting-started.md`; the API is in `user/components.md`.

## Key Paths

| Path                                                 | Purpose                                                                 |
| :--------------------------------------------------- | :---------------------------------------------------------------------- |
| `projects/ngx-formidable/src/lib/`                   | Library source (components, directives, forms, helpers, models, styles) |
| `projects/ngx-formidable/src/public-api.ts`          | Public API — everything the package exports                             |
| `projects/ngx-formidable/src/lib/components/fields/` | Field components                                                        |
| `projects/ngx-formidable/src/lib/forms/`             | The form-level directives and the `FORMIDABLE_VALIDATOR` boundary       |
| `projects/ngx-formidable/src/lib/styles/`            | SCSS tokens, `:root` CSS-variable block, field mixins                   |
| `projects/ngx-formidable/vest/`                      | The Vest adapter, `@cynthion/ngx-formidable/vest`                       |
| `src/app/`                                           | The portal                                                              |
| `dist/ngx-formidable/`                               | ng-packagr output                                                       |
