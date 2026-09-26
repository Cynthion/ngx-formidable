# Definition Of Done

A change is done when every applicable item below holds. Stating that something works is not sufficient — prove it by running the command and reading its output.

## General

- **Conventions**: Coding conventions are followed: [`impl/components.md`](components.md), [`impl/typescript.md`](typescript.md), [`impl/styling.md`](styling.md) and [`impl/ubiquitous-language.md`](ubiquitous-language.md).
- **Testing**: Test conventions from [`impl/testing.md`](testing.md) are followed, helpers first. A logic-bearing change adds its helper spec in the same commit.
- **Build Output**: `dist/`, and the `README.md` and `LICENSE` that `prebuild:lib` copies into `projects/ngx-formidable/`, are never hand-edited.
- **Scope**: The diff is limited to the area the task touches. No unrelated renames, moves, or refactors.
- **Secrets**: No npm token or other credential is committed.
- **Roadmap**: A shipped phase is removed from [`impl/implementation.md`](implementation.md) per its rules. Anything found on the way that is not part of the phase goes to [`impl/backlog.md`](backlog.md).

---

## Verification

Every command runs from the repository root.

| Area               | Command                                                                     | Gate  |
| :----------------- | :-------------------------------------------------------------------------- | :---: |
| Formatting         | `npm run prettier:check`                                                    |  CI   |
| Lint               | `npm run lint`                                                              |  CI   |
| Style Lint         | `npm run style-lint`                                                        |  CI   |
| Token Descriptions | `npm run docs:check`                                                        |  CI   |
| Markdown Lint      | `npm run docs:lint`                                                         |  CI   |
| Library Build      | `npm run build:lib`                                                         |  CI   |
| Library Tests      | `npx ng test ngx-formidable --watch=false --browsers=ChromeHeadless`        |  CI   |
| Portal Tests       | `npx ng test ngx-formidable-portal --watch=false --browsers=ChromeHeadless` |  CI   |
| Portal Build       | `npm run build`                                                             |  CI   |
| Visual Proof       | The served portal, `npm start`                                              | Local |
| README Hero        | `npm run screenshots`                                                       | Local |

- **Chain**: `ci.yml` runs the CI gates in this order on every push to `main` and every pull request, and stops at the first failing step. The workflow is described in [`tech/architecture.md`](../tech/architecture.md).
- **No Typecheck Script**: `build:lib` is the type and template check.
- **Visual Proof**: A user-visible change is proven against the served portal — the Studio's preview form for a field, the Specimen for a theme — not only against a passing test. Reuse a running dev server, never start or stop one that is already running.
- **README Hero**: `npm run screenshots` regenerates `assets/ladder.png` from the served portal after a visual change, see [`impl/documentation.md`](documentation.md).
- **No Commit Hooks**: There is no Husky, lint-staged or commit hook. Every gate is run deliberately.
- **Narrowest Scope First**: Run the narrowest scope first. Widen to the full suite once the narrow scope passes.

### Markdown Gates

- **One Command**: `npm run docs:lint` runs `markdownlint-cli2` over the repository. It checks style, and through `markdownlint-rule-relative-links` it checks that every relative link and heading anchor resolves.
- **Repository Wide**: Always the whole repository, because a link breaks when its target moves rather than when its source changes.
- **Rules**: `.markdownlint.json` holds the rule configuration and is read by both the command and the editor extension.
- **Exclusions**: `.markdownlint-cli2.jsonc` lists the paths that must not be linted: build output, the prebuild copy of `README.md`, and the untracked `.research/` and `.plan/` artifacts.
- **Link Notation**: Autolinks, `<https://example.com>`, fail the gate. Every link carries descriptive text, see [`impl/documentation.md`](documentation.md).
- **Inline HTML**: Only `br` and `img` are allowed. `README.md` opts out around its centred hero and badges with an inline `markdownlint-disable` comment, because npm renders that markup.
- **Editor**: The `davidanson.vscode-markdownlint` extension reports violations while editing. A clean editor is the fastest way to arrive at a green gate.
- **Indentation**: Markdown indentation uses spaces, with no line-length limit and trailing whitespace kept, set in `.editorconfig`. Tabs inside a fenced code block are left alone, because the block is verbatim content.

---

## Library Obligations

- **Component Catalog**: Any change to a public component, directive, token or type is fully reflected in [`user/components.md`](../user/components.md) — the whole entry, prose and input and output tables, not only the changed row.
- **Public API**: A new public symbol is exported from `public-api.ts`; a new component is also added to `NgxFormidableModule`.
- **Doc Comments**: A new or changed public symbol carries a doc comment per **Code Comments** in [`impl/typescript.md`](typescript.md).
- **Theme Tokens**: A new or renamed `--formidable-*` variable is added to `src/app/portal/model/token-manifest.ts` as well as [`user/theme-reference.md`](../user/theme-reference.md), with the same description text. `token-manifest.spec.ts` gates the names and `docs:check` gates the text.

---

## Portal Obligations

- **Showcase**: New or changed fields and features are exercised in the portal's preview form, `src/app/portal/model/preview-form.definition.ts`. A new field component gets a `PortalFieldKind`, a capability row and a specification there, so it renders and can be tried. The portal is the showcase and the only visual-test surface.
- **Portal Tests**: A change under `src/` passes the portal tests, which `npm test` does not run — the project has to be named.

---

## Documentation

- **Conventions**: Documentation guidelines from [`impl/documentation.md`](documentation.md) are followed.
- **User Documentation**: A change to public usage updates the matching `user/*.md`. The root `README.md` changes only when public usage does.
- **Technical Documentation**: A change to a design decision or an internal boundary updates the matching `tech/*.md`. Neither restates the `user/` document it relates to.
- **Implementation Documentation**: A change to the repository setup or a convention updates the matching `impl/*.md`.
- **Index**: A new, renamed or removed document is reflected in [`README.md`](../README.md).
- **Links Resolve**: `npm run docs:lint` passes. A broken relative link or anchor is a defect, not a formatting detail.

---

## Release

- **Branches**: `main` is production. `feature/*` holds work in progress; its pull request runs the same CI gates and publishes nothing.
- **Portal**: A push to `main` deploys the portal to GitHub Pages through `deploy.yml`.
- **Library**: Publishing is manual, from `main`. The steps are in [`impl/releasing.md`](releasing.md). The package layout is in [`tech/architecture.md`](../tech/architecture.md).
- **Versioning**: The library version lives in `projects/ngx-formidable/package.json`. Nothing bumps it automatically.
- **Dependencies**: Renovate proposes updates once a month; Angular majors stay an `ng update`. See [`impl/renovate.md`](renovate.md).
