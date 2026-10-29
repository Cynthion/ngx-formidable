---
name: fd-publish-release
description: Release the library. Draft the release notes, propose the version, then hand over the npm publish, the tag and the GitHub release and verify each. Use when main holds everything the release should contain.
disable-model-invocation: true
---

# Publish A Release

Drive one release of `@cynthion/ngx-formidable`. The steps and their commands are in [`impl/releasing.md`](../../../.documentation/impl/releasing.md). This skill adds where to resume, what is handed over, and how the release notes are written.

Template: [`.claude/skills/fd-publish-release/release.template.md`](release.template.md)

## Prerequisite

`gh` must be authenticated and `npm` logged in as an owner of the `@cynthion` scope. Run `gh auth status` and `npm whoami`; if either fails, ask for `gh auth login` or `npm login` and stop. Do not attempt to authenticate on anyone's behalf.

## Handing Over

**Publish**, **Tag** and **Release** change the registry or the remote, so this skill never runs them, whether or not a local deny rule would stop it. For each: show the command with the version filled in, stop, and once it is reported done run the verification step that follows it. Continue only when the verification passes.

## Where To Resume

Determine the state from what exists, report it, then continue from there. Every check can be repeated, so a release interrupted anywhere resumes in a fresh session. The notes file must exist before **Publish**; draft it when it does not.

| State                                    | Next                                                            |
| :--------------------------------------- | :-------------------------------------------------------------- |
| `version` equals the last tag            | Draft the notes and propose the version, see below              |
| `version` is new and not on the registry | **Check** through **Publish**                                   |
| On the registry, no tag on the remote    | **Verify The Registry**, then **Tag**                           |
| Tag on the remote, no GitHub release     | **Release**                                                     |
| GitHub release exists                    | Report the npm, tag and release links and remove the notes file |

## Proposing The Version

When `version` equals the last tag, nothing is released yet. The notes come first, because their sections are what the **Version** table of [`impl/releasing.md`](../../../.documentation/impl/releasing.md) reads:

1. Collect the pull request bodies since the last tag, the diff of `user/components.md`, `user/theme-reference.md` and the library `package.json` against the last tag, and the `user/` documents that changed.
2. Draft the notes from the template and show them.
3. Propose the version from the table: the bump, the entries it rests on and whether **Early Adoption** applied. Ask for confirmation. Write the notes to `.release/v<x.y.z>.md`.
4. On a `feature/*` branch, set `version` in `projects/ngx-formidable/package.json` and hand over to `/fd-create-pr`. On `main`, stop: the bump reaches `main` through a pull request.

## Writing The Notes

- **For Consumers**: What changes for someone who installs the new version. Not a diff walkthrough, not the mechanism, nothing about the repository.
- **Sections Carry Weight**: `## Breaking Changes` and `## New` decide the bump, so each change goes into the section that names what it is. A rendering change without an API change gets a section named after what moved, for example `## Layout Change`, and is not breaking.
- **Fixes As Rows**: One row per fix, `Field` and `Before`, stated as a consumer saw it.
- **Links To The Portal**: A guide or reference is linked at `https://cynthion.github.io/ngx-formidable/#/docs/<slug>`, the Studio at the root.
- **Install**: The exact version, then `Same peer dependencies as <last>.` or a table of the changed ranges.
- **Not A Change**: The version pull request, a dependency update that leaves the peer ranges, repository tooling.
- **Reviewed Before Handed Over**: Show the draft. Edits land in the file, and the file is what **Release** publishes.
- **Style**: Follow [`.documentation/impl/documentation.md`](../../../.documentation/impl/documentation.md). Run `npx prettier --write` on the file so its tables align.

## Rules

- **`main` Only**: **Check** through **Release** run on a clean, up-to-date `main` with green CI at its head. Report anything else and stop rather than fixing it.
- **Never Publish, Tag, Push Or Create**: Ask, even where no deny rule stops you. A deny rule is a guardrail, not an obstacle to route around.
- **Verify, Then Continue**: A `202` from npm is not a publish; the registry showing the version with the local shasum is. A tag exists once `git ls-remote` lists it, a release once the API returns it.
- **Stop On A Low Version**: A version below the bump the **Version** table requires is never published. Report it; the bump goes through a pull request.
- **Report Plainly**: Each command and its output, failures included.
