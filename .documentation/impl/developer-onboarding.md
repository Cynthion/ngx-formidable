# Developer Onboarding

Everything a machine needs before it can build, test and publish ngx-formidable. The documentation index is [`README.md`](../README.md).

Versions are never pinned here. `.tool-versions` holds the `asdf` toolchain, `.nvmrc` holds the Node version CI reads, and `package.json` holds the dependencies and the Node engine.

## Git

Add local Git configuration at project level:

```zsh
git config --local user.name "<name>"
git config --local user.email "<email>"

# configure VS Code as the default editor
git config --local core.editor "code --wait"

# configure 'merge' strategy
git config pull.rebase false

# configure auto-setup of new branches
git config push.autoSetupRemote true
```

Clone and push over SSH, with a key registered on the GitHub account — see [Connecting To GitHub With SSH](https://docs.github.com/en/authentication/connecting-to-github-with-ssh).

---

## Toolchain

### Node And npm

Install [asdf](https://asdf-vm.com/guide/getting-started.html). The Node version is read from `.tool-versions`:

```zsh
asdf list all nodejs
asdf install nodejs <version>   # if not installed on machine
asdf local nodejs <version>
asdf current                    # verify local usage
```

When the Node version changes, update `.tool-versions`, `.nvmrc` and the `engines` field of `package.json` together.

### Angular CLI

The workspace's own CLI runs through `npx ng`. A global install is optional and must match the Angular major in `package.json`:

```zsh
npm install -g @angular/cli@<major>
```

### Google Chrome

Karma runs both test projects in `ChromeHeadless`, and `npm run screenshots` drives a local Chrome over the DevTools protocol. It expects Chrome at its default macOS path; set `CHROME` to point elsewhere.

### GitHub CLI

[`gh`](https://cli.github.com/) opens and inspects pull requests.

```zsh
brew install gh
gh auth login   # choose github.com and the browser flow
gh auth status
```

`gh auth status` reports the active account. Anything else means the flow did not complete. `gh` keeps its own credential, separate from the SSH key used for `git push`.

---

## Credentials

- **Installing**: needs no credential. The package and all of its dependencies are public on npm.
- **Publishing**: needs `npm login` as an owner of the `@cynthion` scope. The release steps are in [`impl/releasing.md`](releasing.md).
- **Context7**: an API key for the `context7` MCP server, see below.

---

## AI Tooling

This project uses Claude Code. [`CLAUDE.md`](../../CLAUDE.md) holds the behavioral directives and [`impl/ai-harness.md`](ai-harness.md) describes the full setup — rules, agents, skills and MCP servers.

Permissions are personal. Create `.claude/settings.local.json` with at least the deny baseline under **Permissions** in [`impl/ai-harness.md`](ai-harness.md).

### MCP Servers

`.mcp.json` in the repository root is the single source. A server is unusable until every step that applies to it has passed.

| Step         | Applies To      | Action                                                     |
| :----------- | :-------------- | :--------------------------------------------------------- |
| Installation | `stdio` servers | Put `npx` on `PATH` (satisfied by the Node setup above)    |
| Installation | `angular-cli`   | Run `npm install`; it runs the workspace's own CLI         |
| Environment  | `context7`      | Export the variable below from your shell profile          |
| Approval     | Every server    | None — the committed `.claude/settings.json` approves them |
| Verification | Every server    | `claude mcp list`: only `Connected` means tools work       |

A server started before its variables were exported inherits an empty environment, so restart the shell after changing the profile.

```zsh
export CONTEXT7_API_KEY="<context7 api key>"
```

Without an account, set the value in `.mcp.json` to `${CONTEXT7_API_KEY:-}` instead. Claude Code expands that to empty, which suppresses the unset-variable warning; `context7` then serves at a lower rate limit. `angular-cli`, `playwright` and `ux-patterns` read no environment variables.

---

## Install And Run

```zsh
npm install   # from the workspace root — never from inside projects/ngx-formidable
npm start     # serve the portal at http://localhost:4200
```

A nested `projects/ngx-formidable/node_modules` shadows the root install with a second copy of `@angular/core` and breaks the test runner. If you have one, delete it and install from the root.

### Scripts

| Script                   | Does                                                                                        |
| :----------------------- | :------------------------------------------------------------------------------------------ |
| `npm start`              | Serve the portal                                                                            |
| `npm run build`          | Build the portal                                                                            |
| `npm run build:lib`      | Build the library into `dist/ngx-formidable`, which is also the type check                  |
| `npm run prebuild:lib`   | Copy `README.md` and `LICENSE` into the library; runs before `build:lib`                    |
| `npm run publish:lib`    | Publish the built library                                                                   |
| `npm test`               | Run the library tests, see [`impl/testing.md`](testing.md)                                  |
| `npm run lint`           | ESLint over the library and the portal                                                      |
| `npm run style-lint`     | Stylelint over the library and portal SCSS                                                  |
| `npm run prettier:check` | Formatting check across the repository                                                      |
| `npm run docs:check`     | The portal's token manifest against [`user/theme-reference.md`](../user/theme-reference.md) |
| `npm run docs:lint`      | Markdown style, relative links and heading anchors                                          |
| `npm run screenshots`    | Regenerate the README's animated hero from the served portal                                |

When each one runs as a gate is in [`impl/definition-of-done.md`](definition-of-done.md).

---

## Tooling Responsibilities

| Tool           | Responsibility                                                          |
| :------------- | :---------------------------------------------------------------------- |
| Karma, Jasmine | Unit testing, see [`impl/testing.md`](testing.md)                       |
| ng-packagr     | Library build, and with it the type and template check                  |
| ESLint         | Linting, not code formatting                                            |
| Stylelint      | Linting `.scss` files                                                   |
| Prettier       | Code formatting                                                         |
| EditorConfig   | Code formatting, shared with Prettier                                   |
| markdownlint   | Markdown style and links                                                |
| `docs:check`   | Token descriptions in the portal's manifest against the Theme Reference |
| Renovate       | Dependency updates, see [`impl/renovate.md`](renovate.md)               |

- **ESLint**: flat config (`typescript-eslint` + `angular-eslint` + `eslint-plugin-rxjs-x`), type-aware over `projects/ngx-formidable/src`, `projects/ngx-formidable/vest` and `src`. Specs are not linted, but a module only a spec imports still has to belong to a project, which is why `tsconfig.spec.json` is one of the parser's projects. Custom: `@typescript-eslint/no-unused-vars` with `^_` ignore; `rxjs-x/finnish`. `eslint-plugin-rxjs-x` is ESM-only, so the config takes its `.default` — a bare `require` yields the module namespace and the plugin's rules are then invisible. Selector prefixes are in [`impl/components.md`](components.md).
- **Stylelint**: `stylelint-config-standard-scss` only, over `projects/ngx-formidable/src` and `src`.
- **Prettier**: single quotes, no trailing commas, `bracketSameLine`, one attribute per line; HTML attribute order via `prettier-plugin-organize-attributes`.
- **Token Descriptions**: `docs:check` asserts that every token description in the portal's manifest still matches [`user/theme-reference.md`](../user/theme-reference.md), which owns them.
