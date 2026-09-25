# Documentation Guide

How to write docs in `.documentation/`. This is the single source for documentation style — other docs and skills link here, they do not restate it. The index is `.documentation/README.md`.

Documentation sits in three buckets, one per audience. The root `README.md` is the entry point for consumers and links onward.

| Bucket  | Audience               | Holds                                                                     |
| :------ | :--------------------- | :------------------------------------------------------------------------ |
| `user/` | Consumers              | The per-topic usage authority: how to use a feature and what it accepts   |
| `tech/` | Maintainers            | Design decisions, internal boundaries and the reasoning behind them       |
| `impl/` | Whoever works the repo | Roadmap, conventions, testing strategy, this guide, the Claude Code setup |

A document belongs to exactly one bucket. When two overlap, one links to the other rather than restating it, and the link runs `tech/` to `user/`, not back.

## Documentation Style

- **Single Source Of Truth**: Each fact, rule, contract, or concept has exactly one authoritative home. Other documentation links to that source instead of copying it. Copies drift apart and deteriorate over time.
- **Open Closed Principle**: Extend documentation by adding a new document, section, or reference. Do not duplicate existing content or rewrite stable documentation unless its contract or meaning has changed.
- **Stable Documentation**: Document contracts, concepts, decisions, and behavior that are expected to remain valid. Avoid details that become outdated quickly unless they are required for correct use.
- **Current State Only**: Document the current state, not the history of how it evolved. Do not describe what was previously broken, changed, removed, or fixed. Use version control and issue tracking for historical context.
- **Writing Style**: Write briefly, precisely, and factually. Prefer direct statements, lists, tables, and diagrams over prose. Do not add commentary, clever phrasing, filler, or narrative explanation.
- **Headings**: Use Pascal Case for headings at every level, for example `### Field Components`.
- **List Labels**: Use bold Pascal Case lead terms, for example `**Field Contract**`.
- **Table Labels**: Use Pascal Case for table headings and left-align text columns, center-align boolean and short value columns, and right-align numeric columns.
- **Table Alignment**: Align text columns left with `:--`, boolean and short value columns center with `:--:`, and numeric columns right with `--:`.
- **Inline Code**: Use backticks for all commands, file names, identifiers, values, and inline code.
- **File References**: Name a document by its full path relative to `.documentation/`, bucket and group included.
- **Version References**: Do not document version numbers. Refer to tools and dependencies by name. Treat `package.json` and similar files as the source of truth for versions.
- **Preferred Structures**: Prefer lists, tables, and Mermaid diagrams over prose when they communicate the same information.
- **Section Separators**: Use `---` only between `##` sections. Never use it within a section.
- **Paragraph Formatting**: Do not insert manual line breaks within sentences or paragraphs. Allow text to wrap naturally.
- **Explicit Line Breaks**: Use `<br/>` only when a line break is required inside a table cell or Mermaid diagram.
- **Mermaid Labels**: Use Pascal Case for labels, titles, table label entries, etc. Use `<br/>` for line breaks. Do not use `\n`.
- **Tone**: Treat documentation as reference material, not promotional content. Use plain English and factual statements. Do not use promotional adjectives or adverbs.
- **Punctuation**: Use an em dash for a parenthetical or an abrupt turn. Do not use one as a general purpose connector where a comma, colon or semicolon reads as well.
- **Placeholders**: Wrap a placeholder in backticks, for example `` `<TBD>` `` or `` `<TBD ZPFP-868>` ``. Unbackticked angle brackets are parsed as inline HTML and fail the lint gate. Name the work item when one exists, so the placeholder is traceable.

## Diagrams

- **Authoring Tool**: Author diagrams in Mermaid.
- **Inline Diagrams**: Use Mermaid for a diagram that belongs inside a document rather than beside it.

## Assets

- **Assets Directory**: Every file a document references, image or template, lives in an `assets/` directory beside that document. Never beside the document itself.
- **Asset References**: Reference an asset relative to the referencing document, for example `![name](./assets/image.png)`.
- **README Exception**: the root `README.md` is also the npm package's README, where a repository path does not resolve. It references an asset by its absolute `raw.githubusercontent.com` URL on `main`.
- **Show It Live, Not In A Picture**: what the fields look like is shown on the portal's Specimen route, where every name is a link, rather than in screenshots a document embeds. The one exception is `assets/ladder.png`, the README's animated hero, because npm renders no live page. It is generated by `npm run screenshots` from the served portal; regenerate it after a visual change and never edit it by hand.

## Source Code

- **Self-Documenting Code**: Write source code with clear names, types, and structure so its behavior and intent are evident from the code.
- **Code Documentation**: Document source code only when the code cannot express the required context clearly, such as a complex algorithm, non-obvious constraint, or design decision.
