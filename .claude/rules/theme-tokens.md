---
paths:
  - 'projects/ngx-formidable/src/lib/styles/_formidable-vars.scss'
  - 'projects/ngx-formidable/src/lib/styles/_tokens.scss'
  - 'src/app/portal/model/token-manifest.ts'
  - '.documentation/user/theme-reference.md'
---

# Theme Tokens

A `--formidable-*` variable lives in three places that must agree: the stylesheet, the portal's token manifest and the Theme Reference. Changing one is only a third of the change.

The contract is `Theme Tokens` in [`impl/definition-of-done.md`](../../.documentation/impl/definition-of-done.md). `token-manifest.spec.ts` gates the names and `npm run docs:check` gates the descriptions.
