# Releasing

How to release the library: the version, the release notes, the npm package, the tag and the GitHub release. Branch and versioning rules are under **Release** in [`impl/definition-of-done.md`](definition-of-done.md). `/fd-publish-release` drives the steps below and hands over the ones that stay manual, see [`impl/ai-harness.md`](ai-harness.md).

A release is published from `main` only, never from a `feature/*` branch. A published version cannot be republished, so every step verifies its result before the next one starts.

## Version

The release notes decide the version, so they are drafted first. Squash commits on `main` carry the pull request bodies, which list what changed since the last release:

```zsh
git fetch origin
git describe --tags --abbrev=0 origin/main
git log v<last>..origin/main --format='----- %h %s%n%b'
```

| The Notes Hold                                         | Bump                                     |
| :----------------------------------------------------- | :--------------------------------------- |
| A `## Breaking Changes` section                        | Major, or Minor under **Early Adoption** |
| A `## New` section, or a changed peer dependency range | Minor                                    |
| Fixes only                                             | Patch                                    |

- **Breaking**: A renamed or removed public input, output, token, type, `--formidable-*` variable or styling class a consumer could target, and a peer range that drops a version it accepted. A pull request's own **Breaking Changes** entry is the input, not the verdict: a change of rendering only, with no API change, is a rendering change in the notes and a minor at most.
- **Early Adoption**: In effect. The library has few consumers, so a breaking change costs them less than a major per release would. It bumps the minor, and the notes still list it under `## Breaking Changes`. The policy ends by a decision recorded here, not by a release; from then on a breaking change is a major.
- **Proposal**: The bump, the entries it rests on and the policy applied are stated and confirmed before `version` is set.

`version` in `projects/ngx-formidable/package.json` is set on a feature branch and reaches `main` through a pull request. Nothing bumps it automatically.

## Release Notes

The body of the GitHub release, written for consumers of the package. The draft lives in `.release/v<x.y.z>.md`, untracked, until the release exists. Template and writing rules: [`.claude/skills/fd-publish-release/SKILL.md`](../../.claude/skills/fd-publish-release/SKILL.md).

## Steps

Every command runs from the repository root. **Publish**, **Tag** and **Release** change the registry or the remote. They are run by hand, and the step after each verifies the result.

1. **Check**: Switch to an up-to-date `main` with a clean tree. CI must be green at its head, and the version must be new:

   ```zsh
   git switch main && git pull
   git status --porcelain
   gh run list --branch main --limit 2 --json name,conclusion,headSha
   npm view @cynthion/ngx-formidable@<x.y.z> version --prefer-online
   ```

   The last command fails with `E404` while the version is unpublished, which is the expected state. A version it prints is already published, so `version` was not bumped.

2. **Log In**: `npm whoami` names an owner of the `@cynthion` scope. Otherwise:

   ```zsh
   npm login
   ```

3. **Build**: `npm run build:lib` copies `README.md` and `LICENSE` into the library, then builds into `dist/ngx-formidable`. Its `package.json` carries the new version:

   ```zsh
   npm run build:lib
   node -p "require('./dist/ngx-formidable/package.json').version"
   ```

4. **Compare**: The package's files against the last release. A file the new package lacks is a removed entry point, a breaking change the version must count:

   ```zsh
   diff <(npm pack @cynthion/ngx-formidable@<last> --dry-run --json | jq -r '.[0].files[].path') \
        <(npm pack ./dist/ngx-formidable --dry-run --json | jq -r '.[0].files[].path')
   ```

5. **Publish**: By hand. `npm run publish:lib` publishes `dist/ngx-formidable` with public access, set by `publishConfig`. It may log a `401` before the OTP prompt, then `PUT 202`: the registry processes the upload for a few minutes.

   ```zsh
   npm run publish:lib
   ```

6. **Verify The Registry**: The version shows with the shasum of the local tarball. Repeat until it does:

   ```zsh
   npm view @cynthion/ngx-formidable@<x.y.z> dist.shasum --prefer-online
   npm pack ./dist/ngx-formidable --dry-run --json | jq -r '.[0].shasum'
   ```

7. **Tag**: By hand. Tag the head of `main` and push the tag:

   ```zsh
   git tag v<x.y.z> && git push origin v<x.y.z>
   ```

8. **Verify The Tag**: The remote lists it:

   ```zsh
   git ls-remote --tags origin v<x.y.z>
   ```

9. **Release**: By hand. Create the GitHub release from the tag, with the notes as its body:

   ```zsh
   gh release create v<x.y.z> --verify-tag --title v<x.y.z> --notes-file .release/v<x.y.z>.md
   ```

10. **Verify The Release**: The API returns it. Then remove `.release/v<x.y.z>.md`:

    ```zsh
    gh api repos/{owner}/{repo}/releases/tags/v<x.y.z> --jq .html_url
    ```
