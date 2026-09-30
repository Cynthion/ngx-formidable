# Architecture

Structure of the `ngx-formidable` repository: a publishable Angular library and the portal that showcases it.

For component conventions see [`impl/components.md`](../impl/components.md); for the component/directive catalogue see [`user/components.md`](../user/components.md).

## Repository Structure

```txt
ngx-formidable/
├── projects/ngx-formidable/   # the publishable library → @cynthion/ngx-formidable
├── src/                       # the portal
├── dist/                      # build output
├── .documentation/            # docs: user/ for consumers, tech/ for maintainers, impl/ for repo work
└── .github/workflows/         # checks and the GitHub Pages deploy of the portal
```

Two Angular projects are declared:

- `ngx-formidable` library
- `ngx-formidable-portal` application

## Library

The library ships one entry point. Its source lives under `projects/ngx-formidable/src/lib/`; everything public is re-exported from `public-api.ts`.

```txt
projects/ngx-formidable/
└── src/                                  # → @cynthion/ngx-formidable
    └── lib/
        ├── components/
        │   ├── field-decorator/          # wraps a field with label, adornment, prefix, suffix, hints, errors
        │   ├── field-errors/             # renders messages
        │   ├── field-option/             # a single option inside option-based fields
        │   └── fields/                   # field components, base directives
        ├── directives/                   # field-decoration directives
        ├── helpers/                      # pure functions: mask, input, format, position, option, utility
        ├── models/                       # formidable.model.ts (UI), validation.model.ts (reveal, message text)
        ├── styles/                       # SCSS tokens, the :root CSS-variable block, field mixins
        ├── testing/                      # the spec helpers, unreachable from public-api.ts
        └── provide-ngx-formidable.ts     # provideNgxFormidable()
```

**Composition Model**: field components implement Angular's `FormValueControl` through a `value` model and register the `FORMIDABLE_FIELD` token; `FieldDecorator` projects a field plus its label/adornment/prefix/suffix/errors; option-based fields collect `FieldOption` children via `contentChildren()`. The abstract `BaseField` is the shared base and the extension point for custom fields; the abstract `BaseTextField` extends it for `input-field` and `textarea-field` and their mask; the abstract `BaseDateTimeField` extends it for `date-field` and `time-field`, their token format, mask, parse and arrow-key steps; the abstract `BaseOptionListField` extends it for every field that renders an option list, and `BaseOptionField` extends that for the four that walk the list with a highlight. See [`user/components.md`](../user/components.md).

**Forms Integration**: `[formField]`, `ngModel`, `[formControl]` and `formControlName` bind every field alike, as a `FormValueControl`. The rules belong to the consumer's forms API, and the library ships no validator. See [`tech/forms-integration.md`](forms-integration.md) and [`user/validation.md`](../user/validation.md).

**Change Detection**: the library holds no `NgZone`. Its listeners write signals, which schedule change detection from any callstack. Under `provideZoneChangeDetection()` those listeners run inside the zone, so every `keydown` in a field that handles keys, and every document `click` and `scroll` and window `resize` while a panel field is on the page, schedules an application tick.

## Portal

The portal (`src/`) is a standalone-bootstrapped application that showcases every field and serves as the dev playground. Its `/` route is the Studio and its `/docs` route mirrors `user/*.md`; [`tech/portal.md`](portal.md) is its design and [`user/studio.md`](../user/studio.md) the consumer's guide to it. It is deployed to GitHub Pages by `deploy.yml` on push to `main` (builds and publishes `dist/ngx-formidable-portal`). The portal consumes the library, not the other way round.

The portal lives in `src/app/portal/` and is routed with hash location, because GitHub Pages serves no SPA fallback. Its design is [`tech/portal.md`](portal.md).

| Path                  | Holds                                                                           |
| :-------------------- | :------------------------------------------------------------------------------ |
| `portal/model/`       | The field specifications, the capability table, the token manifest, the schemes |
| `portal/state/`       | The three signal stores: form definition, model, theme                          |
| `portal/stage/`       | The preview form, the model drawer and the accessibility readout                |
| `portal/inspector/`   | The theme editor, the field editor and the structure editor                     |
| `portal/export/`      | Theme export and import, and the markup serializer and parser                   |
| `src/styles/portal/`  | The portal's own appearance, the chrome insulation and the shared controls      |
| `src/app/example-*`   | The custom field, option, icon and tooltip the portal projects                  |
| `src/app/validation/` | The Vest and Zod integration specs, run under Signal Forms                      |

**Mirrored Documentation**: the `Docs` route imports `.documentation/user/*.md` as text — `angular.json` maps `.md` to esbuild's `text` loader for the application and the test target — and renders it with `marked`. The markdown is the single source: there is no second copy to drift, and the deploy stays static because nothing is fetched. `docs:check` still guards the token manifest, whose descriptions the **inspector** reads for inline help.

**Chrome Insulation**: the portal's own controls read `--formidable-*`, and the user's theme is written to `:root`, so the chrome would follow it. It cannot be insulated by scoping alone — most of the library's variables are derived and declared once, in that `:root` block, so an override further down the tree leaves the derived ones frozen. The chrome therefore re-emits the whole default block under `.portal-chrome`, where derivation recomputes against its own bases. That is what the `formidable-vars` mixin in `_formidable-vars.scss` exists for; it is not forwarded from `_ngx-formidable.scss`, so the closed SCSS surface is unchanged.

## Build And Publish

The scripts are listed in [`impl/developer-onboarding.md`](../impl/developer-onboarding.md) and the release steps in [`impl/definition-of-done.md`](../impl/definition-of-done.md). `build:lib` builds the library with ng-packagr into `dist/ngx-formidable`; `prebuild:lib` copies `README.md` and `LICENSE` into the library first.

ng-packagr config:

- `ng-package.json` sets the entry file to `public-api.ts`, outputs to `dist/ngx-formidable`, and ships the library SCSS as assets under `dist/ngx-formidable/styles/`.
- The package is published as `@cynthion/ngx-formidable` to npm, public through `publishConfig.access`.

## Continuous Integration

Two workflows in `.github/workflows/`. Both take the Node version from `.nvmrc` and install with `npm ci`, so a run resolves exactly the committed lockfile.

| Workflow     | Trigger                              | Does                                                                                                        |
| :----------- | :----------------------------------- | :---------------------------------------------------------------------------------------------------------- |
| `ci.yml`     | Push to `main`, pull request, manual | `prettier:check`, `lint`, `style-lint`, `docs:check`, `docs:lint`, `build:lib`, both test projects, `build` |
| `deploy.yml` | Push to `main`, manual               | Builds the portal and deploys `dist/ngx-formidable-portal/browser` to GitHub Pages                          |

- **Checks Mirror The Scripts**: `ci.yml` runs the same scripts a contributor runs locally, in the order of the Verification table in [`impl/definition-of-done.md`](../impl/definition-of-done.md). `build:lib` is in it because it is also the type and template check — there is no standalone typecheck script.
- **Tests**: the two projects are separate steps, because `ng test` takes one project at a time. Both run in `ChromeHeadless` with `--watch=false`.
- **Dependency Updates**: Renovate opens the pull requests, and `ci.yml` checks them like any other — see [`impl/renovate.md`](../impl/renovate.md).

## Consumer Setup

One wiring path, `provideNgxFormidable()`, listed in `bootstrapApplication` or in a root module's `providers`. Styling is imported separately, because it is a stylesheet and not a provider. The steps a consumer follows are in [`user/getting-started.md`](../user/getting-started.md); the API is in [`user/components.md`](../user/components.md).

## Key Paths

| Path                                                 | Purpose                                                          |
| :--------------------------------------------------- | :--------------------------------------------------------------- |
| `projects/ngx-formidable/src/lib/`                   | Library source (components, directives, helpers, models, styles) |
| `projects/ngx-formidable/src/public-api.ts`          | Public API — everything the package exports                      |
| `projects/ngx-formidable/src/lib/components/fields/` | Field components                                                 |
| `projects/ngx-formidable/src/lib/styles/`            | SCSS tokens, `:root` CSS-variable block, field mixins            |
| `src/app/`                                           | The portal                                                       |
| `dist/ngx-formidable/`                               | ng-packagr output                                                |
