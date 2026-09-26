---
name: fd-create-component
description: Create or modify a component or directive in ngx-formidable with correct placement, selector, field contract, catalog entry and portal showcase. Use when a field, structural component, directive, portal example or portal component is added, moved, or has its inputs or outputs changed.
---

# Create A Component

The conventions live in `.documentation/impl/`. This skill covers the wiring mechanics and does not restate them.

## 1. Decide Placement First

Placement decides the folder, the selector prefix, and whether the component is published. The placement table and the selector rules are in [`impl/components.md`](../../../.documentation/impl/components.md) — read it first.

Mirror the nearest sibling rather than starting from nothing: copy its folder, rename, and keep its input and output order, provider block and template attribute order.

## 2. Wire A Library Component

1. Export it from `projects/ngx-formidable/src/public-api.ts` and add it to `NgxFormidableModule`.
2. For a field: extend `BaseFieldDirective<T>` (or `BaseOptionFieldDirective` for a highlighted option list) and register the `NG_VALUE_ACCESSOR` and `FORMIDABLE_FIELD` providers per the field contract. Implement the abstract members — `fieldRef`, `decoratorLayout`, `value`, `doWriteValue` / `doOnValueChange` / `doOnFocusChange`, the keyboard, click and resize callbacks and `registeredKeys`. `example-counter-field` is the reference implementation.
3. Add or update its entry in [`user/components.md`](../../../.documentation/user/components.md).
4. A new `--formidable-*` variable goes into `src/app/portal/model/token-manifest.ts` and [`user/theme-reference.md`](../../../.documentation/user/theme-reference.md) with the same description.

## 3. Showcase It In The Portal

A new field kind is not done until it renders in the Studio:

1. Add a `PortalFieldKind`, a row to `FIELD_CAPABILITIES` and to `FIELD_KIND_SELECTORS` in `src/app/portal/model/field-capabilities.ts`.
2. Add a `@case` in `src/app/portal/stage/preview-form/preview-field.component.html`.
3. Add at least two specifications in `src/app/portal/model/preview-form.definition.ts`.

A portal example under `src/app/example-<name>/` is not exported and not catalogued, but must be reachable from `src/main.ts`.

## 4. Conventions

Read what applies before writing.

| Concern                                          | Document                                                                             |
| :----------------------------------------------- | :----------------------------------------------------------------------------------- |
| Placement, selectors, field contract, signal API | [`impl/components.md`](../../../.documentation/impl/components.md)                   |
| Style layers, theming, host font                 | [`impl/styling.md`](../../../.documentation/impl/styling.md)                         |
| Strictness, immutability, doc comments           | [`impl/typescript.md`](../../../.documentation/impl/typescript.md)                   |
| Names                                            | [`impl/ubiquitous-language.md`](../../../.documentation/impl/ubiquitous-language.md) |

## 5. Prove It

Run the `fd-review-change` skill.
