# Documentation Index

How to write docs: `impl/documentation.md`. Source of truth for outstanding work: `impl/implementation.md`.

Three buckets, one per audience. The root `README.md` is the entry point for consumers and links in here; `CONTRIBUTING.md` beside it is the entry point for contributors.

---

## User

For consumers of the library. A **guide** teaches a topic; a **reference** lists what it accepts.

| File                      |   Kind    | Purpose                                                                |
| :------------------------ | :-------: | :--------------------------------------------------------------------- |
| `user/getting-started.md` |   Guide   | Registry, install, wiring, the stylesheet, a first form                |
| `user/fields.md`          |   Guide   | Options, panels, keyboard, dates and times, masking, focus             |
| `user/decoration.md`      |   Guide   | Labels, adornments, prefixes, suffixes, hints, required marker         |
| `user/validation.md`      |   Guide   | Connecting a validator: Vest, Angular, zod or none; conditional fields |
| `user/theming.md`         |   Guide   | The default theme, how theming works, and how to find your own         |
| `user/studio.md`          |   Guide   | The Studio: build a theme and a form, and take both away               |
| `user/custom-fields.md`   |   Guide   | Building a field, an option or a validator of your own                 |
| `user/components.md`      | Reference | Catalogue of every public component, directive, token and type         |
| `user/theme-reference.md` | Reference | Every overridable `--formidable-*` custom property                     |

---

## Tech

For maintainers of the library.

| File                   | Purpose                                                            |
| :--------------------- | :----------------------------------------------------------------- |
| `tech/architecture.md` | Workspace structure, library and portal roles, build and publish   |
| `tech/decoration.md`   | The decorator, field and errors wiring: slot, ids, repaint, insets |
| `tech/layering.md`     | Stacking contexts, the layer ordinals and the two public z-indices |
| `tech/validation.md`   | The validation seam, its three layers and the package layout       |

---

## Impl

For whoever works the repo.

| File                     | Purpose                                                  |
| :----------------------- | :------------------------------------------------------- |
| `impl/backlog.md`        | Raw intake buffer for new, untriaged ideas               |
| `impl/claude-code.md`    | The Claude Code setup for this repo                      |
| `impl/conventions.md`    | Coding conventions, Definition of Done                   |
| `impl/documentation.md`  | Documentation style and authoring guide                  |
| `impl/implementation.md` | Phased roadmap, the source of truth for outstanding work |
| `impl/portal.md`         | Portal design: structure, theming, state, phases         |
| `impl/testing.md`        | Testing strategy, helpers first                          |
