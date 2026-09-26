# Releasing

How to publish the library to npm. Branch and versioning rules are under **Release** in [`impl/definition-of-done.md`](definition-of-done.md).

## Publishing The Library

A release is published from `main` only, never from a `feature/*` branch.

1. On the feature branch, set `version` in `projects/ngx-formidable/package.json` to the new `<x.y.z>`, then merge the pull request into `main`.
2. Switch to an up-to-date `main`:

   ```zsh
   git switch main && git pull
   ```

3. Log in to npm as an owner of the `@cynthion` scope. `npm whoami` shows whether a session already exists.

   ```zsh
   npm login
   ```

4. Run `npm run build:lib`. It copies `README.md` and `LICENSE` into the library, then builds into `dist/ngx-formidable`.
5. Run `npm run publish:lib`. It publishes `dist/ngx-formidable` with public access, set by `publishConfig`. A published version cannot be republished.
6. Tag the release on `main` and push the tag:

   ```zsh
   git tag v<x.y.z>
   git push origin v<x.y.z>
   ```
