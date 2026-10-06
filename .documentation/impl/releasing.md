# Releasing

How to publish the library to npm. Branch and versioning rules are under **Release** in [`impl/definition-of-done.md`](definition-of-done.md).

## Publishing The Library

A release is published from `main` only, never from a `feature/*` branch.

1. On the feature branch, set `version` in `projects/ngx-formidable/package.json` to the new `<x.y.z>`, then merge the pull request into `main`. A breaking change since the last release tag makes it a major. Each merged pull request lists its own under **Breaking Changes**, which this prints:

   ```zsh
   git log v<last>..main --format=%B | awk '/^## Breaking Changes/{f=1;next} /^## /{f=0} f'
   ```

2. Switch to an up-to-date `main`:

   ```zsh
   git switch main && git pull
   ```

3. Log in to npm as an owner of the `@cynthion` scope. `npm whoami` shows whether a session already exists.

   ```zsh
   npm login
   ```

4. Run `npm run build:lib`. It copies `README.md` and `LICENSE` into the library, then builds into `dist/ngx-formidable`.
5. Compare the package's files with the last release. A file the new one lacks is a removed entry point, a breaking change that step 1 must have counted:

   ```zsh
   npm pack @cynthion/ngx-formidable@<last> --dry-run
   npm pack ./dist/ngx-formidable --dry-run
   ```

6. Run `npm run publish:lib`. It publishes `dist/ngx-formidable` with public access, set by `publishConfig`. A published version cannot be republished. The registry processes it for a few minutes; `npm view @cynthion/ngx-formidable@<x.y.z> --prefer-online` shows it once done.
7. Once it shows, tag the release on `main` and push the tag:

   ```zsh
   git tag v<x.y.z>
   git push origin v<x.y.z>
   ```
