# Documentation Guide

How to write docs in `.documentation/`. This is the single source for documentation style — other docs and skills link here, they do not restate it. The index is `README.md`.

## Open-Closed / DRY

- Each fact has exactly ONE authoritative home. Extend the docs by adding a new doc or section, never by duplicating existing content.
- Other docs link to the authoritative source; they never copy it. Copies drift apart and deteriorate over time.
- The user-facing `README.md` (repo root) is the usage source of truth; `.documentation/` docs are the contributor reference. When they overlap, one links to the other rather than restating.

## Style

- **Headings**: Pascal Case at every level (`### Field Components`).
- **List Labels**: Pascal Case bold lead terms (`**Field Contract**`).
- **Mermaid**: Pascal Case labels; `<br/>` for line breaks (not `\n`).
- `---` only between `##` headings — never inside a section.
- **Table Alignment**: text left (`:--`), boolean or short value center (`:--:`), numeric right (`--:`).
- Prefer lists, tables and Mermaid over prose.
- **File References**: file names only, never full paths.
- Backticks for all inline code, commands, file names, identifiers and values.
- No version numbers — reference tools by name; `package.json` is the source of truth.
- No line breaks in the middle of sentences or paragraphs.
