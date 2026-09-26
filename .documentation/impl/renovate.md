# Renovate

Dependency updates arrive as pull requests from the Renovate GitHub App. `renovate.json` at the repository root is the configuration; this document is its rationale.

## Setup

- **App**: the Renovate GitHub App must be installed on the repository. Without it the configuration does nothing.
- **Schedule**: the whole first day of each month, UTC. Security fixes ignore the schedule.
- **Release Age**: an npm release is proposed only once it is three days old, so a release that is unpublished or turns out malicious never reaches a pull request.
- **Dependency Dashboard**: an issue Renovate keeps current, listing every pending, gated and open update.
- **Validation**: `npx --package renovate -- renovate-config-validator --strict`, from the repository root.

---

## Pull Requests

Packages share a pull request when one peers the other's major. A pull request carrying only half of such a pair fails `npm ci`.

| Pull Request                 | Holds                                                                                     |
| :--------------------------- | :---------------------------------------------------------------------------------------- |
| `all non-major dependencies` | Every minor and patch update — Angular, Node and GitHub Actions included                  |
| `Angular (major)`            | `@angular/*`, `angular-eslint`, `ng-packagr`, `ngx-mask`, `typescript`, `zone.js` — gated |
| `ESLint (major)`             | `eslint`, `@eslint/js`, `typescript-eslint`, `eslint-plugin-rxjs-x`                       |
| `Stylelint (major)`          | `stylelint`, `stylelint-config-standard-scss`                                             |
| `Prettier (major)`           | `prettier`, `prettier-plugin-organize-attributes`                                         |
| `Karma (major)`              | `karma`, `karma-*`, `jasmine-core`, `@types/jasmine`, `istanbul-lib-instrument`           |
| `GitHub Actions (major)`     | Every action in `.github/workflows/`                                                      |
| One per package              | Any other major, such as `marked`, `date-fns` or `vest`                                   |

- **Majors Apart**: a major never joins the monthly non-major pull request, so a breaking release cannot block it.
- **Lockfile Only**: an update inside an existing caret range changes `package-lock.json` and leaves `package.json` alone.

---

## Angular Majors

An Angular major moves with `ng update`, whose migrations Renovate cannot run. The `Angular (major)` update therefore waits on the Dependency Dashboard instead of opening a pull request.

1. Leave the dashboard checkbox unticked — ticking it opens a pull request without the migrations.
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

`typescript`, `jasmine-core` and `@types/jasmine` are held below a ceiling by `allowedVersions`. `renovate.json` holds the exact bounds. Renovate does not warn when a ceiling goes stale: raise it in `renovate.json` once its reason is gone.

- **TypeScript**: capped by `@angular/compiler-cli` and `ng-packagr`, which both peer a single TypeScript minor — so the next TypeScript major is unavailable while the current Angular major is the floor.
- **Jasmine**: `jasmine-core` stays below the major that makes `describe`/`it` read-only on the global, which breaks `zone.js`'s `patchJasmine` and with it every `fakeAsync` spec.

---

## Limits

- **No Scripts**: the hosted app runs no project scripts, so an update that needs a code change — a reformat after a `prettier` release, a migration — fails CI and needs a fix-up commit on its branch.
- **Deploy Workflow**: `deploy.yml` runs only on `main`, so no pull request proves an update to the GitHub Pages actions.
