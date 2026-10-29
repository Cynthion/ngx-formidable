<!-- markdownlint-disable-file -->
<!-- Body of the GitHub release v<x.y.z>, written for consumers of the package. -->
<!-- Style follows .documentation/impl/documentation.md: Pascal Case headings, bold Pascal Case list labels, tables over prose. -->
<!-- A section is omitted when it has nothing. `## Breaking Changes` and `## New` decide the bump through the Version table in .documentation/impl/releasing.md. -->
<!-- Never add the markdownlint-disable-file to the release. It only serves for this template. -->
<!-- Never mention the co-authoring or generation by AI tooling in the release. -->

<One or two sentences: what the release means for a consumer, and whether the public API changed.>

## Breaking Changes

- **<Input, Output, Token, Type Or `--formidable-*` Variable>**: <what changed, and what a consumer changes>.

## <Rendering Change>

<A change a consumer sees without an API change, under a heading that names what moved, for example `## Layout Change`: what is different, and what a consumer can drop or must adjust.>

## New

- **<Feature, Input Or `--formidable-*` Variable>**: <what it does, and its default>. See the [<Guide Or Reference>](https://cynthion.github.io/ngx-formidable/#/docs/<slug>).

## Fixes

| Field   | Before                                  |
| :------ | :-------------------------------------- |
| <Field> | <What went wrong, as a consumer saw it> |

## Documentation

- **[<Guide>](https://cynthion.github.io/ngx-formidable/#/docs/<slug>)**: <what it now covers>.

## Install

```bash
npm i @cynthion/ngx-formidable@<x.y.z>
```

<`Same peer dependencies as <last>.`, or a table of the changed peer dependency ranges.>

**Full Changelog**: [v<last>...v<x.y.z>](https://github.com/Cynthion/ngx-formidable/compare/v<last>...v<x.y.z>)
