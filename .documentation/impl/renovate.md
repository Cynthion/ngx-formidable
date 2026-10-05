# Renovate

Dependency updates arrive as pull requests from the Renovate GitHub App.

## Setup

- **Schedule**: the whole first day of each month, UTC. Security pull requests ignore it, see [Dependabot](#dependabot).
- **Release Age**: an npm release is proposed only once it is three days old, so a release that is unpublished or turns out malicious never reaches a pull request.
- **Dependency Dashboard**: an issue Renovate keeps current, listing every pending, gated and open update.
- **Validation**: `npx --package renovate -- renovate-config-validator --strict`, from the repository root.
- **MCP Servers**: a regex manager reads the `npx` pins in `.mcp.json`. `angular-cli` runs the workspace CLI and moves with `@angular/cli`.

---

## GitHub Configuration

Settings that live outside the repository, made once by the repository owner. Without them `renovate.json` opens nothing.

### Renovate App

- **Installation**: avatar menu, `Settings`, `Applications`, `Installed GitHub Apps`, `Renovate`, `Configure`. `Repository access` includes this repository.
- **Permissions**: the same page lists `Read access to Dependabot alerts`. A permission Mend adds later waits there as a request until it is accepted.
- **Mode**: the repository runs in `Interactive` mode in the [Mend Developer Portal](https://developer.mend.io/github/Cynthion/ngx-formidable). `Silent` mode opens no pull requests and no issues, and is the default when the app is installed on all repositories.

### Dependabot

Renovate opens every dependency pull request. Of GitHub's Dependabot features only the alerts are on, as the vulnerability feed Renovate reads. The settings are under the repository's `Settings`, `Advanced Security`.

| Feature                     | State | Reason                                                                        |
| :-------------------------- | :---: | :---------------------------------------------------------------------------- |
| Dependency Graph            |  On   | Required by Dependabot alerts                                                 |
| Dependabot Alerts           |  On   | Renovate turns each alert into a security pull request                        |
| Dependabot Security Updates |  Off  | Duplicates Renovate's security pull requests                                  |
| Dependabot Version Updates  |  Off  | Duplicates every Renovate pull request, so no `.github/dependabot.yml` exists |

- **Security Pull Requests**: one per vulnerable package, suffixed `[SECURITY]`, outside any group and ignoring schedule, gates and release age.

---

## Pull Requests

Packages share a pull request when one peers the other's major. A pull request carrying only half of such a pair fails `npm ci`.

| Pull Request                 | Holds                                                                         |
| :--------------------------- | :---------------------------------------------------------------------------- |
| `all non-major dependencies` | Every minor and patch update, including Angular, Node, GitHub Actions and MCP |
| `Angular (major)`            | Gated: `@angular/*`, `angular-eslint`, `ng-packagr`, `ngx-mask`, `typescript` |
| `ESLint (major)`             | `eslint`, `@eslint/js`, `typescript-eslint`, `eslint-plugin-rxjs-x`           |
| `Stylelint (major)`          | `stylelint`, `stylelint-config-standard-scss`                                 |
| `Prettier (major)`           | `prettier`, `prettier-plugin-organize-attributes`                             |
| `Vitest (major)`             | `vitest`, `@vitest/*`                                                         |
| `GitHub Actions (major)`     | Every action in `.github/workflows/`                                          |
| One per package              | Any other major, such as `marked`, `date-fns` or `vest`                       |

- **Majors Apart**: a major never joins the monthly non-major pull request, so a breaking release cannot block it.
- **Lockfile Only**: an update inside an existing caret range changes `package-lock.json` and leaves `package.json` alone.

---

## Angular Majors

An Angular major moves with `ng update`, whose migrations Renovate cannot run. The `Angular (major)` update therefore waits on the Dependency Dashboard instead of opening a pull request.

1. Leave the dashboard checkbox unticked: ticking it opens a pull request without the migrations.
2. On a feature branch, run `ng update @angular/core @angular/cli angular-eslint`, one major at a time.
3. Raise the `typescript` ceiling in `renovate.json` if the new major lifts the peer that caps it.
4. Move the library's Angular and `ngx-mask` peers to the new major.

---

## Peer Ranges

Renovate edits the library's `peerDependencies` in the same pull request that moves the matching dev dependency, so CI tests the new major before the range claims it.

| Peers                    | Strategy | Effect                                                                                                        |
| :----------------------- | :------: | :------------------------------------------------------------------------------------------------------------ |
| `@angular/*`, `ngx-mask` | Replace  | The floor moves to the new major: an app must run the Angular major the library was built with, or newer      |
| Everything else          |  Widen   | The new major is appended, `^3.0.0` becoming `^3.0.0 \|\| ^4.0.0`, so consumers on the older one keep working |

CI tests only the newest version, so an older major in a widened range is proven once, when it is widened. Code that starts to need the newer major drops the older one from the range.

---

## Ceilings

`typescript`, `vitest` and `@vitest/*` are held below a ceiling by `allowedVersions`. `renovate.json` holds the exact bounds. Renovate does not warn when a ceiling goes stale: raise it in `renovate.json` once its reason is gone.

- **TypeScript**: capped by `@angular/compiler-cli` and `ng-packagr`, which both peer a single TypeScript minor, so the next TypeScript major is unavailable while the current Angular major is the floor.
- **Vitest**: `@angular/build` peers the Vitest majors its `unit-test` builder supports, so the next Vitest major waits for the Angular release that adds it. Raise the ceiling together with that `@angular/build`.

---

## Limits

- **No Scripts**: the hosted app runs no project scripts, so an update that needs a code change (a reformat after a `prettier` release, a migration) fails CI and needs a fix-up commit on its branch.
- **Deploy Workflow**: `deploy.yml` runs only on `main`, so no pull request proves an update to the GitHub Pages actions.
- **MCP Servers**: no CI starts an MCP server. A `@playwright/mcp` bump also needs its Chromium build installed, see [`impl/developer-onboarding.md`](developer-onboarding.md).
