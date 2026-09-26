---
name: fd-write-documentation
description: Write or update repository documentation following the documentation guidelines. Use when a change needs its documentation updated, when a new document must be placed in the right bucket, or when documentation drifts from the code.
---

# Write Documentation

Apply [`impl/documentation.md`](../../../.documentation/impl/documentation.md). Read it first — it is the single source for style and bucket placement, and this skill does not restate it.

## Placement

The buckets, what each holds, and which content is documented at all are defined in [`impl/documentation.md`](../../../.documentation/impl/documentation.md). The existing documents per bucket are listed in [`README.md`](../../../.documentation/README.md) — extend one of them rather than adding a new file.

## Workflow

1. Decide whether a document is needed at all. Self-documenting code and an existing document that already covers it both beat a new file.
2. Find the authoritative home. Search for the fact before writing it — if it already exists, link to it and stop.
3. Write or extend. Extending an existing section beats adding a parallel one.
4. A `user/` document is also rendered by the portal: check that it reads correctly on the served `Docs` route when its structure changes.
5. Update `.documentation/README.md` when a file is added, removed, or moved.
6. Verify: `npm run docs:lint` — style, relative links and heading anchors. A change to `user/theme-reference.md` also runs `npm run docs:check`.

## Rules

- **Read The Guide First**: `impl/documentation.md` is the single source for style and placement. This skill does not restate it — apply it.
- **No Noisy Reformatting**: Do not rewrap or reformat Markdown you did not change.
- **Cross-Link Both Ways**: A new document references related documents and is referenced by them, so it is reachable.
- **README Is Published**: The root `README.md` is also the npm package's README. It links by absolute GitHub URL, never by repository path.
