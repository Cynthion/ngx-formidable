# Documentation Guidelines

How to write docs in `.documentation/`. This is the single source for documentation style. The index is `.documentation/README.md`.

Documentation sits in three buckets, one per audience. The root `README.md` is the entry point for consumers and links onward.

| Bucket  | Audience               | Holds                                                                                                          |
| :------ | :--------------------- | :------------------------------------------------------------------------------------------------------------- |
| `user/` | Consumers              | The per-topic usage authority: how to use a feature and what it accepts.                                       |
| `tech/` | Maintainers            | Technical documentation of features, configurations, patterns and architecture, and the reasoning behind them. |
| `impl/` | Whoever works the repo | Technical documentation of the setup and conventions used in this repository, and its work items.              |

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
- **File References**: Name a document by its full path relative to `.documentation/`, bucket and group included, as the text of a link to it, for example [`user/theming.md`](../user/theming.md).
- **Version References**: Do not document version numbers. Refer to tools and dependencies by name. Treat `package.json` and similar files as the source of truth for versions.
- **Preferred Structures**: Prefer lists, tables, and Mermaid diagrams over prose when they communicate the same information.
- **Section Separators**: Use `---` only between `##` sections. Never use it within a section.
- **Paragraph Formatting**: Do not insert manual line breaks within sentences or paragraphs. Allow text to wrap naturally.
- **Explicit Line Breaks**: Use `<br/>` only when a line break is required inside a table cell or Mermaid diagram.
- **Mermaid Labels**: Use Pascal Case for labels, titles, table label entries, etc. Use `<br/>` for line breaks. Do not use `\n`.
- **Tone**: Treat documentation as reference material, not promotional content. Use plain English and factual statements. Do not use promotional adjectives or adverbs.
- **Punctuation**: Use an em dash for a parenthetical or an abrupt turn. Do not use one as a general purpose connector where a comma, colon or semicolon reads as well.
- **Placeholders**: Wrap a placeholder in backticks, for example `` `<TODO>` ``. Unbackticked angle brackets are parsed as inline HTML and fail the lint gate. Name the roadmap phase or backlog item when one exists, so the placeholder is traceable.
- **Maintenance**: Keep documentation up-to-date with code changes. Review and update regularly to ensure accuracy and relevance.

## Technical & Implementation Documentation

- **Purpose**: Technical and implementation documentation serves as a reference for maintainers, providing detailed information about the implementation, architecture, and conventions of the library and the portal.
- **Audience**: Whoever maintains the library or works the repository.
- **Content**: Should include architecture diagrams, code examples, and explanations of key concepts and decisions.
- **Related Section**: Do not include a related section with references to other documents.

## User Documentation

- **Purpose**: User documentation is the reference for consumers of the library, providing guidance on how to install, configure, theme and extend it.
- **Audience**: Developers who use the library in their own Angular application.
- **Content**: A **guide** teaches a topic; a **reference** lists what it accepts. Code examples compile against the published package.
- **Related Section**: Include a related section with references to other relevant user documents to provide additional context and information.
- **Rendered By The Portal**: every `user/` document is also rendered by the portal's `Docs` route. How its links resolve there is in [`tech/portal.md`](../tech/portal.md).

## Link Notation

Always use Markdown link notation: `[text](path)`. Link text describes the target, so `here` and a raw URL are both unacceptable.
Autolink notation, `<https://example.com>`, is rejected by the lint gate.

## Diagrams

- **Authoring Tool**: Author diagrams in Mermaid.
- **Inline Diagrams**: Use Mermaid for a diagram that belongs inside a document rather than beside it.

## Assets

- **Assets Directory**: Every file a document references, image or template, lives in an `assets/` directory beside that document. Never beside the document itself.
- **Asset References**: Reference an asset relative to the referencing document, for example `![name](./assets/image.png)`.
- **README Exception**: the root `README.md` is also the npm package's README, where a repository path does not resolve. It references an asset and a document by its absolute GitHub URL on `main`.
- **Show It Live, Not In A Picture**: what the fields look like is shown on the portal's Specimen route, where every name is a link, rather than in screenshots a document embeds. The one exception is `assets/ladder.png`, the README's animated hero, because npm renders no live page. It is generated by `npm run screenshots` from the served portal; regenerate it after a visual change and never edit it by hand.

## Source Code

- **Library Components**: Do not write a document per component. The public API is catalogued once, in [`user/components.md`](../user/components.md).
- **Self-Documenting Code**: Write source code with clear names, types, and structure so its behavior and intent are evident from the code.
- **Code Documentation**: Document source code only when the code cannot express the required context clearly, such as a complex algorithm, non-obvious constraint, or design decision. Doc comment rules are in [`impl/typescript.md`](typescript.md).

## Validation

Style and link gates, their scope, and the exclusion mechanism are defined in [`impl/definition-of-done.md`](definition-of-done.md).
