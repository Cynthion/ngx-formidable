# Layering

How the library decides what paints over what.

## The Rule

> **`layer`** is a private ordinal inside a field's own stacking context.
> **`z-index`** is a public number in the consumer's page stack.

Two words, two scopes, no overlap. A consumer only ever meets a `z-index`; the library only ever reasons in `layer`s.

## The Atom

A field is an **atom**: one stacking context holding everything it renders. Whatever the consumer stacks around it, the atom's contents stay ordered relative to each other and none of them can escape.

| Case             | Atom Root                                             | Set By                                 |
| :--------------- | :---------------------------------------------------- | :------------------------------------- |
| With a decorator | `formidable-field-decorator` host                     | `field-atom` in the decorator's SCSS   |
| Without one      | the field component's own host, via `.is-undecorated` | `field-atom-undecorated`, panel fields |

`BaseFieldDirective` sets `is-undecorated` from its optional `FieldDecoratorComponent` injection. Only the fields with a panel apply the undecorated rules — nothing else a bare field renders leaves its own box.

**`isolation: isolate`, never `transform`.** Both open a stacking context, but `transform` also makes the element the containing block for `position: fixed` — which would pin a sheet to the field instead of to the viewport.

## The Ladder

Private ordinals, inside the atom. Small on purpose: they order four things against each other and mean nothing outside.

| Layer                            | Value | Must Out-paint                                                                           |
| :------------------------------- | ----: | :--------------------------------------------------------------------------------------- |
| `$formidable-layer-label`        |   `1` | the field's own box — resting/floating labels and prefix/suffix adornments sit over it   |
| `$formidable-layer-panel`        |   `2` | the labels and adornments an open panel covers                                           |
| `$formidable-layer-label-border` |   `3` | a panel flipped `above`, whose bottom edge lands on the strip a `border` label straddles |
| `$formidable-layer-sheet`        |   `4` | its own field's `border` label, which reaches higher than anything else the field paints |

## The Lift

The atom itself carries no `z-index` while closed — that is what keeps a resting field out of the consumer's stack entirely. While a panel is open it has to cover what surrounds it, so the whole atom rises, and only then.

| State Class      | Layer Rises To               | When                                        |
| :--------------- | :--------------------------- | :------------------------------------------ |
| `has-open-panel` | `--formidable-panel-z-index` | `isPanelOpen`, any anchored `panelPosition` |
| `has-open-sheet` | `--formidable-sheet-z-index` | `isPanelOpen` and `panelPosition="sheet"`   |

Both classes come from `openPanelPosition()` in `formidable.model.ts` — the decorator reads its projected field, `BaseFieldDirective` reads itself when undecorated. A sheet ranks above an anchored panel because it spans the viewport and covers more, including any other field's open panel it crosses.

The atom rising as a whole is what lets the ladder stay small. Cross-field ordering is settled between atoms before any ordinal is consulted, so a sheet covers a neighbouring field's `border` label without either number knowing about the other.

It also means the field box and its label rise with the panel, not just the panel — an open field behind a consumer's sticky header paints over it for as long as it is open. That is the trade the design makes: the alternative is letting one part of a field out on its own, which is the defect it replaced.

## Invariants

Break one of these and the ladder collapses silently — the paint order stays plausible until a panel flips or a sheet opens.

- **No `z-index` or `transform` on `.field`, `.container-horizontal` or `.input-wrapper`.** Each would open a stacking context between the atom and the layers it orders, trapping the panel below the labels it must cover.
- **The lift is conditional.** An unconditional `z-index` on the atom puts every closed field back in the consumer's stack, which is the defect this design exists to remove.
- **`position: fixed` is still the consumer's to protect.** A sheet spans the viewport, so an ancestor of theirs with `transform`, `filter` or `contain` pins it to that ancestor instead. `isolation` on the atom does not, which is why it is the primitive used here.
- **Ordinals stay private.** They are SCSS variables, not custom properties: a consumer moving one would reorder a field's internals against each other, which no theme should be able to do.

Pinned by the `the atom` and `a border label against a flipped panel` suites in `border-geometry.spec.ts`.
