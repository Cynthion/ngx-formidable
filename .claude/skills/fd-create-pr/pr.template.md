<!-- markdownlint-disable-file -->
<!-- Title and description become the squash commit subject and body on main. -->
<!-- Title: <Outcome, imperative, Pascal Case, as short as it can be, no trailing period> -->
<!-- Style follows .documentation/impl/documentation.md: Pascal Case headings, bold Pascal Case list labels, tables over prose, current state only. -->
<!-- Never add the markdownlint-disable-file to the actual PR description. It only serves for this template. -->
<!-- Never add "Generated with Claude Code" or similar to the actual PR description." -->

## What

<What the change makes possible, abstractly. Two or three sentences. Name the outcome, not the mechanism, and not the files.>

## Why

<The driving need. Link the roadmap phase in .documentation/impl/implementation.md when there is one.>

## Notes

- **<Label>**: <A decision worth knowing, or something a reviewer should look at closely. Omit the section when there is nothing.>

## Breaking Changes

<Each renamed or removed public input, output, token, type or `--formidable-*` variable, and what a consumer changes. Omit the section when there is nothing.>

## Developer Actions

<What someone else has to do because of this change: local setup to run, and anything to exercise by hand. Omit the section when there is nothing.>

| Action      | Reason               |
| :---------- | :------------------- |
| `<command>` | <Why it is required> |

## Verification

| Gate        |       Result       |
| :---------- | :----------------: |
| `<command>` | <Pass, or nothing> |

<Optional single line for a caveat the table cannot carry.>
