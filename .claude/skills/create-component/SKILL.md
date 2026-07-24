---
name: create-component
description: Guidance for adding a field or structural component to ngx-formidable — placement, selector, the BaseFieldDirective field contract, and styling.
---

# Create a component

## 1. Decide placement FIRST

- **Library component** (published, part of the public API)
  → field: `projects/ngx-formidable/src/lib/components/fields/<name>/`; structural: `components/<name>/`
  → element selector `formidable-<name>`, `standalone: true`, `ChangeDetectionStrategy.OnPush`
  → export from `public-api.ts` and add to `NgxFormidableModule`
  → **must** add or update its entry in @.documentation/ui_components.md
  → **must** showcase it in the demo (`example-form`) — add the field to its template + model so it renders and can be tried.
- **Demo example** (showcase/playground only, not published)
  → `src/app/example-<name>/`, element selector `example-<name>`
  → not exported, not listed in `ui_components.md`.

## 2. Field contract (for a new field)

A field extends `BaseFieldDirective<T>` and registers two providers:

- `{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => XComponent), multi: true }`
- `{ provide: FORMIDABLE_FIELD, useExisting: XComponent }`

Option-based fields also `@ContentChildren(FORMIDABLE_FIELD_OPTION)` and provide `FORMIDABLE_OPTION_FIELD`. Implement the abstract members (`fieldRef`, `decoratorLayout`, `value`, `doWriteValue` / `doOnValueChange` / `doOnFocusChange`, the keyboard/click/resize callbacks + `registeredKeys`).

Reference implementation: `example-custom-color-picker` in the demo. Full contract: @.documentation/ui_components.md.

## 3. Conventions (see @.documentation/conventions.md)

- External `*.component.ts` / `.html` / `.scss` — never inline templates or styles.
- Style via the SCSS mixins + `--formidable-*` CSS custom properties; expose new theming as a CSS variable, never a hardcoded value.
- Classic `@Input()` on fields; observable outputs get the `$` suffix.
- Mirror sibling fields (input/output order, provider block, template attribute order).

## 4. Prove it — run the `verify` skill.
