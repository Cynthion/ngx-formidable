---
name: fd-create-pr
description: Open a pull request for the current branch. Use when the Definition of Done is met and the change is ready for review.
disable-model-invocation: true
effort: low
---

# Create A Pull Request

Open one pull request against `main` for the current branch.

Template: `.claude/skills/fd-create-pr/pr.template.md`

## Prerequisite

`gh` must be authenticated. Run `gh auth status`; if it fails, ask for `gh auth login` and stop. Do not attempt to authenticate on anyone's behalf.

## Pushing

Remote changes stay manual, so this skill never pushes — whether or not a local deny rule would stop it. It prepares everything, then stops and asks for the push:

```zsh
git push
```

Once the branch is on the remote, continue and open the request.

## Workflow

1. Confirm the current branch is not `main`, and that it is not dirty. Report a dirty tree and stop rather than cleaning it.
2. Confirm the Definition of Done is met. Run `fd-review-change` first if it has not been run, and carry its gate results into the description.
3. Collect the change: `git fetch origin main:refs/remotes/origin/main`, then the diff summary against `origin/main` and the plan artifact if one exists.
4. Draft the title and description from the template. Show the draft for review before anything is opened.
5. Ask for the push. Wait for confirmation that it happened.
6. Open the request. Write the description to a file and pass it by path — a multi-line description inlined into the shell breaks on quoting.
7. Report the URL.

```zsh
gh pr create --base main --title "<title>" --body-file <file>
gh pr edit <number> --body-file <file>
```

## Writing The Description

- **Abstract, Not A Diff Walkthrough**: Say what the change does and why. The reviewer can read the files.
- **Brief**: A few sentences and a short list. If it needs more, the request is too large.
- **Outcome First**: Lead with what is now possible or fixed, not with the mechanism.
- **Name The Risk**: Call out anything a reviewer should look at closely.
- **Name The Breaking Change**: A renamed or removed public input, output, token, type or `--formidable-*` variable is stated as breaking, with what a consumer changes.
- **Name What Others Must Do**: Local setup a puller has to run, and anything to exercise by hand in the portal, belongs in `Developer Actions`. A change that silently expects new tooling costs everyone who pulls it.
- **Style**: Follow `.documentation/impl/documentation.md`. Run `npx prettier --write` on the description file so its tables align.

## Rules

- **Reviewed Before Opened**: Never open a request without showing the draft.
- **Never Push To `main`**: Refuse if the current branch is `main`.
- **Never Push At All**: Ask, even where no deny rule stops you. A deny rule is a guardrail, not an obstacle to route around.
- **Refuse On Dirty**: Do not stash, commit, or discard anything to make the tree clean.
- **No Unrelated Files**: Report anything staged that is not part of this change and stop rather than including it.
