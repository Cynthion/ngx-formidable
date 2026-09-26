# Styling

Where styles live and how a theme reaches them. Every overridable variable is listed in [`user/theme-reference.md`](../user/theme-reference.md); stacking is in [`tech/layering.md`](../tech/layering.md).

- **Two Layers**: `_tokens.scss` holds compile-time SCSS primitives (the default values); `_formidable-vars.scss` emits a `:root` block of runtime CSS custom properties named `--formidable-{category}-{name}` (e.g. `--formidable-color-field-border`, `--formidable-field-height`), each mapped to its token default.
- **Theming**: consumers theme by overriding `--formidable-*` custom properties in their own `:root` — they never touch SCSS tokens. Many variables self-reference, so overriding one base cascades to derived ones.
- **New Theming Is A Variable**: a new themeable value is exposed as a `--formidable-*` custom property, never hardcoded.
- **Host Font**: a component's `:host` starts with `font-family: var(--formidable-font-family);`.
- **Field Styling**: all field CSS lives in `mixins/_forms.scss` (with `_css-icons.scss`, `_utils.scss`).
- **Global Rules**: `_globals.scss` and `_pikaday.scss` hold the rules that cannot be scoped to a component — those that must reach consumer-projected content or third-party DOM, which view encapsulation puts out of a component stylesheet's reach.
- **Closed SCSS Surface**: `_ngx-formidable.scss` only ever `@use`s its parts, never `@forward`s them — the public entry point ships CSS, not an API, so no internal mixin or function reaches a consumer's namespace. Component stylesheets take the internal surface from `variables.scss` by relative path instead.
- **Consuming Styles**: the portal imports `@use 'ngx-formidable'` (resolved via the `angular.json` `includePaths`); an external consumer imports `@use '@cynthion/ngx-formidable/styles/ngx-formidable'` (resolved from the published package).
