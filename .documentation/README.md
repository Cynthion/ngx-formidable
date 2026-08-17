# Documentation Index

How to write docs: `impl/documentation.md`. Source of truth for outstanding work: `impl/implementation.md`.

Three buckets, one per audience. The root `README.md` is the entry point for consumers and links in here.

---

## User

For consumers of the library.

| File                      | Purpose                                                        |
| :------------------------ | :------------------------------------------------------------- |
| `user/components.md`      | Catalogue of every public component, directive, token and type |
| `user/theming.md`         | The default theme, how theming works, and how to find your own |
| `user/theme-reference.md` | Every overridable `--formidable-*` custom property             |
| `user/theme-options.md`   | Colour and geometry schemes to start from                      |
| `user/validation.md`      | How to connect a validator: Vest, Angular, zod or none         |

---

## Tech

For maintainers of the library.

| File                   | Purpose                                                            |
| :--------------------- | :----------------------------------------------------------------- |
| `tech/architecture.md` | Workspace structure, library and demo roles, build and publish     |
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
| `impl/testing.md`        | Testing strategy, helpers first                          |
