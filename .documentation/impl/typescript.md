# TypeScript

Compiler strictness, immutability and code comments. Dependency ceilings on the compiler are in [`impl/renovate.md`](renovate.md).

## Compiler

- Strict everything: `strict`, `noImplicitOverride`, `noImplicitReturns`, `noFallthroughCasesInSwitch`, `noPropertyAccessFromIndexSignature`, `noUncheckedIndexedAccess`, `noUnusedLocals`, `noUnusedParameters`. Angular compiler runs `strictTemplates`, `strictInjectionParameters`, `strictInputAccessModifiers`, `strictStandalone`.
- `module` is `preserve`, which implies `moduleResolution: bundler` and forces `esModuleInterop`, so neither is declared. `useDefineForClassFields` is left at its `ES2022` default of `true`; the extended diagnostics Angular promotes to errors are **not** suppressed, so `nullishCoalescingNotNullable` and `optionalChainNotNullable` both fail the build.

---

## Immutable Programming

- Prefer immutable transformations; do not mutate inputs or shared state.
- Prefer `map`, `filter`, `reduce` and spread when they improve clarity; do not use `map` for side effects.
- Omit properties with destructuring instead of `delete`.
- Local mutation is fine when it does not escape the function. Use `readonly` where practical; spread is shallow.

---

## Code Comments

- **Public Surface**: every exported symbol, every `@Input()` / `@Output()`, and every protected member a custom field overrides carries a doc comment. One to two lines of intent, stating what a caller cannot read off the signature. Consumers read these in their editor.
- **Not A Second Signature**: never restate what the code says. No hand-maintained `Inputs:` / `Outputs:` lists on a class, and no `@input` / `@output` tags, which are not JSDoc and render as literal text.
- **Usage Lives Elsewhere**: no `@example` blocks. Usage belongs in the `user/` guides and [`user/components.md`](../user/components.md), which have exactly one copy of it.
- **Inline Comments**: minimize them; prefer self-explanatory code and names. The exception is a trap, where the comment stays at the line it protects rather than moving to `tech/`.
- **Rationale Goes To `tech/`**: a comment explaining a cross-file design belongs in the matching `tech/*.md`, with a one-line pointer left behind.
- **Consumer Perspective**: a doc comment answers what a consumer does with the symbol — what it is, what it accepts, and which sibling to pick instead. It never explains how the library is built. State the differences between components explicitly, because that is what a consumer reads the comment for.
- **Shipped, Not Repo-Relative**: doc comments reach a consumer's editor through the published `.d.ts`. `.documentation/` is not published, so no doc comment references a `user/` or `tech/` path; state the fact inline instead. Such a pointer lives in a `//` comment, which no `.d.ts` carries.
- **Visibility Decides Audience**: a `public` member's doc is consumer-facing. A `protected` member's is extender-facing, and earns a doc comment only where it is part of the extension contract on `BaseFieldDirective` or `BaseOptionFieldDirective`. A `private` member's doc is stripped from the `.d.ts` altogether, so its rationale belongs in a `//` comment.
