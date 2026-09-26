# Documentation Index

How to write documents: [`impl/documentation.md`](impl/documentation.md). Source of truth for outstanding work: [`impl/implementation.md`](impl/implementation.md).

Three buckets, one per audience. The root [`README.md`](../README.md) is the entry point for consumers and links in here; [`CONTRIBUTING.md`](../CONTRIBUTING.md) beside it is the entry point for contributors. Introduce directory hierarchy only if necessary.

## User

For consumers of the library. A **guide** teaches a topic; a **reference** lists what it accepts. The portal's `Docs` route renders the same files.

| File                                                 |   Kind    | Purpose                                                                |
| :--------------------------------------------------- | :-------: | :--------------------------------------------------------------------- |
| [`user/getting-started.md`](user/getting-started.md) |   Guide   | Install, wiring, the stylesheet, a first form                          |
| [`user/fields.md`](user/fields.md)                   |   Guide   | Options, panels, keyboard, dates and times, masking, focus             |
| [`user/decoration.md`](user/decoration.md)           |   Guide   | Labels, adornments, prefixes, suffixes, hints, required marker         |
| [`user/validation.md`](user/validation.md)           |   Guide   | Connecting a validator: Vest, Angular, zod or none; conditional fields |
| [`user/theming.md`](user/theming.md)                 |   Guide   | The default theme, how theming works, and how to find your own         |
| [`user/studio.md`](user/studio.md)                   |   Guide   | The Studio: build a theme and a form, and take both away               |
| [`user/custom-fields.md`](user/custom-fields.md)     |   Guide   | Building a field, an option or a validator of your own                 |
| [`user/components.md`](user/components.md)           | Reference | Catalogue of every public component, directive, token and type         |
| [`user/theme-reference.md`](user/theme-reference.md) | Reference | Every overridable `--formidable-*` custom property                     |

---

## Tech

For maintainers of the library and the portal. Contains technical documentation of features, configurations, patterns and architecture.

| File                                           | Purpose                                                            |
| :--------------------------------------------- | :----------------------------------------------------------------- |
| [`tech/architecture.md`](tech/architecture.md) | Workspace structure, library and portal roles, build and publish   |
| [`tech/caret.md`](tech/caret.md)               | Caret placement on focus entry, and the ngx-mask timing around it  |
| [`tech/decoration.md`](tech/decoration.md)     | The decorator, field and errors wiring: slot, ids, repaint, insets |
| [`tech/layering.md`](tech/layering.md)         | Stacking contexts, the layer ordinals and the two public z-indices |
| [`tech/portal.md`](tech/portal.md)             | Portal design: page structure, theming, preview form, state        |
| [`tech/validation.md`](tech/validation.md)     | The validation seam, its three layers and the package layout       |

---

## Impl

For whoever works the repository. Contains technical documentation of the setup and conventions used in the repository, and the repository's own work items.

| File                                                           | Purpose                                                 |
| :------------------------------------------------------------- | :------------------------------------------------------ |
| [`impl/ai-harness.md`](impl/ai-harness.md)                     | AI setup of this repository                             |
| [`impl/components.md`](impl/components.md)                     | Placement, selectors, field contract, signal API        |
| [`impl/definition-of-done.md`](impl/definition-of-done.md)     | Definition of Done                                      |
| [`impl/developer-onboarding.md`](impl/developer-onboarding.md) | Toolchain, credentials, install, scripts                |
| [`impl/documentation.md`](impl/documentation.md)               | Documentation style and authoring guide                 |
| [`impl/renovate.md`](impl/renovate.md)                         | Dependency updates: groups, Angular majors, peer ranges |
| [`impl/styling.md`](impl/styling.md)                           | Style layers, theming, where styles live                |
| [`impl/testing.md`](impl/testing.md)                           | Testing strategy, helpers first                         |
| [`impl/typescript.md`](impl/typescript.md)                     | Compiler strictness, immutability, code comments        |
| [`impl/ubiquitous-language.md`](impl/ubiquitous-language.md)   | One name per concept                                    |

Work items:

| File                                               | Purpose                                                  |
| :------------------------------------------------- | :------------------------------------------------------- |
| [`impl/backlog.md`](impl/backlog.md)               | Raw intake buffer for new, untriaged ideas               |
| [`impl/implementation.md`](impl/implementation.md) | Phased roadmap, the source of truth for outstanding work |
