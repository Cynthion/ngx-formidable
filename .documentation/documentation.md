# Documentation Guide

How to write docs in `.documentation/`. This is the single source for documentation style — other docs and skills link here, they do not restate it. The index is `README.md`.

The user-facing `README.md` (repo root) is the entry point for consumers and links onward; `.documentation/user/` holds the per-topic usage authority and `.documentation/tech/` the maintainer reference. When they overlap, one links to the other (file link) rather than restating.

## Documentation Style

- **Single Source Of Truth**: Each fact, rule, contract, or concept has exactly one authoritative home. Other documentation links to that source instead of copying it. Copies drift apart and deteriorate over time.
- **Open Closed Principle**: Extend documentation by adding a new document, section, or reference. Do not duplicate existing content or rewrite stable documentation unless its contract or meaning has changed.
- **Stable Documentation**: Document contracts, concepts, decisions, and behavior that are expected to remain valid. Avoid details that become outdated quickly unless they are required for correct use.
- **Current State Only**: Document the current state, not the history of how it evolved. Do not describe what was previously broken, changed, removed, or fixed. Use version control and issue tracking for historical context.
- **Writing Style**: Write briefly, precisely, and factually. Prefer direct statements, lists, tables, and diagrams over prose. Do not add commentary, clever phrasing, filler, or narrative explanation.
- **Headings**: Use Pascal Case for headings at every level, for example `### Field Components`.
- **List Labels**: Use bold Pascal Case lead terms, for example `**Field Contract**`.
- **Inline Code**: Use backticks for all commands, file names, identifiers, values, and inline code.
- **File References**: Reference file names only. Do not include directory paths in prose.
- **Version References**: Do not document version numbers. Refer to tools and dependencies by name. Treat `package.json` and similar as the source of truth for versions.
- **Preferred Structures**: Prefer lists, tables, and Mermaid diagrams over prose when they communicate the same information.
- **Section Separators**: Use `---` only between `##` sections. Never use it within a section.
- **Paragraph Formatting**: Do not insert manual line breaks within sentences or paragraphs. Allow text to wrap naturally.
- **Explicit Line Breaks**: Use `<br/>` only when a line break is required inside a table cell or Mermaid diagram.
- **Table Alignment**: Align text columns left with `:--`, boolean and short value columns center with `:--:`, and numeric columns right with `--:`.
- **Mermaid Labels**: Use Pascal Case for labels. Use `<br/>` for line breaks. Do not use `\n`.
- **Tone**: Treat documentation as reference material, not promotional content. Use plain English and factual statements. Do not use adjectives or adverbs to characterize the library or its features.
- **Punctuation**: Do not use em dashes or decorative dash based phrasing. Use commas, colons, semicolons, or separate sentences instead.
