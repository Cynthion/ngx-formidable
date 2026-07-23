# Conventions

Coding conventions for the library. See also: `architecture.md` (structure, key paths), `ui_components.md` (component/directive API), `testing.md`, `documentation.md`.

## Components And Directives

- **Standalone**: every component and directive is `standalone: true`. Consumers import them directly or via `NgxFormidableModule`.
- **Change Detection**: every component uses `ChangeDetectionStrategy.OnPush`.
- **Selectors**: components are elements, kebab-case, `formidable-` prefix (`formidable-input-field`). Field-decoration directives are attributes, camelCase, `formidable` prefix (`[formidableFieldLabel]`, `form[formidableForm]`). Two directives intentionally hijack Angular's own selectors — `FormModelDirective` on `[ngModel]` and `FormModelGroupDirective` on `[ngModelGroup]` — so they attach to every model-bound control (they no-op outside a formidable form).
- **File Naming**: components are folders with external `*.component.ts` / `.html` / `.scss` (never inline templates or styles). Directives are single `*.directive.ts` files. The shared base is `base-field.directive.ts`.

## Field Contract

- Field components extend `BaseFieldDirective<T>` and register two providers: `NG_VALUE_ACCESSOR` (via `forwardRef`, `multi: true`) and `FORMIDABLE_FIELD` (`useExisting`) — this is what makes them work with `ngModel` and be discovered by `FieldDecoratorComponent`.
- Option-based fields additionally collect options with `@ContentChildren(FORMIDABLE_FIELD_OPTION)` and provide `FORMIDABLE_OPTION_FIELD`.
- `BaseFieldDirective` is the extension point for custom fields; `example-custom-color-picker` in the demo is the reference implementation. The full contract is documented in `ui_components.md`.

## Inputs, Outputs And Observables

- **Inputs**: components and fields use classic `@Input()`; the newer signal `input()` API is used only in the form-level directives (`FormDirective`, `FormModelDirective`, `FormModelGroupDirective`, `FormRootValidateDirective`).
- **Outputs**: a mix of `@Output() EventEmitter` and RxJS observable outputs.
- **Observable Naming**: append `$` (`valueChange$`, `formValueChange$`). Enforced by the `rxjs-x/finnish` ESLint rule (exempts `EventEmitter` and Angular lifecycle hooks like `canActivate`/`validate`).

## Immutable Programming

- Prefer immutable transformations; do not mutate inputs or shared state.
- Prefer `map`, `filter`, `reduce` and spread when they improve clarity; do not use `map` for side effects.
- Omit properties with destructuring instead of `delete`.
- Local mutation is fine when it does not escape the function. Use `readonly` where practical; spread is shallow.

## Code Comments

- Minimize inline comments; prefer self-explanatory code and names.
- Add a brief doc comment only on exported/public members whose intent is not obvious from the signature.

## Styling

- **Two Layers**: `_tokens.scss` holds compile-time SCSS primitives (the default values); `_formidable-vars.scss` emits a `:root` block of runtime CSS custom properties named `--formidable-{category}-{name}` (e.g. `--formidable-color-field-border`, `--formidable-field-height`), each mapped to its token default.
- **Theming**: consumers theme by overriding `--formidable-*` custom properties in their own `:root` — they never touch SCSS tokens. Many variables self-reference, so overriding one base cascades to derived ones.
- **Field Styling**: all field CSS lives in `mixins/_forms.scss` (with `_pikaday.scss`, `_css-icons.scss`, `_utils.scss`).
- **Consuming Styles**: the demo imports `@use 'ngx-formidable'` (resolved via the `angular.json` `includePaths`); an external consumer imports `@use '@cynthion/ngx-formidable/styles/ngx-formidable'` (resolved from the published package). The full overridable-variable list lives in the root `README.md`.

## TypeScript

- Strict everything: `strict`, `noImplicitOverride`, `noImplicitReturns`, `noFallthroughCasesInSwitch`, `noPropertyAccessFromIndexSignature`, `noUncheckedIndexedAccess`, `noUnusedLocals`, `noUnusedParameters`. Angular compiler runs `strictTemplates`, `strictInjectionParameters`, `strictInputAccessModifiers`.

## Tooling

- **ESLint**: flat config (`typescript-eslint` + `angular-eslint` + `eslint-plugin-rxjs-x`), type-aware. Specs are not linted. Custom: `@typescript-eslint/no-unused-vars` with `^_` ignore; `rxjs-x/finnish`.
- **Prettier**: single quotes, no trailing commas, `bracketSameLine`, one attribute per line; HTML attribute order via `prettier-plugin-organize-attributes`.
- **Stylelint**: `stylelint-config-standard-scss` + `stylelint-config-prettier-scss`; modern color-function notation, long hex.

## Development Workflow

- **Branches**: `main` is production — push triggers the GitHub Pages deploy of the demo. `feature/*` for work in progress.
- **Publishing**: `build:lib` then `publish:lib` to GitHub Packages; `@cynthion` scope needs `~/.npmrc` auth. See `architecture.md`.
- **Backlog**: `backlog.md` is the single source of truth — check it before starting work.

## Definition Of Done

- **Conventions**: selectors, standalone/OnPush, field contract, naming followed.
- **Formatting**: `prettier:check`, `lint` and `style-lint` pass.
- **Component Docs**: any component/directive API change is reflected in `ui_components.md`.
- **Demo**: new or changed fields and features are exercised in the demo app (`example-form`); a new field component is wired into it so it renders and can be tried. The demo is the showcase and the only visual-test surface — see `architecture.md`.
- **Documentation**: new behavior documented per `documentation.md`; the user-facing `README.md` updated when public usage changes.
- **Tests**: implemented per `testing.md` (helpers-first).
- **Build**: `build:lib` compiles without errors.
- **Backlog**: related `backlog.md` items updated or removed.
