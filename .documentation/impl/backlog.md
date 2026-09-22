# Backlog

## Bugs

- `textarea-field`'s length indicator renders `{{ value?.length || 0 }}`, and `value` reads the textarea element — a DOM read, against the `impl/conventions.md` rule that state a template reads is a signal. Under zone change detection every write path is followed by a tick, so it keeps up; zonelessly a programmatic masked write repaints nothing and the count goes stale. The fix is to back the count with a signal written wherever the element's value is, as `select-field` now does for its selection.

- A standalone `ngModel` — one outside a `<form>` — sets up its control synchronously from `NgModel.ngOnChanges`, which is before the field's own view exists. Every field whose `doWriteValue` reaches for a view ref therefore crashes: `input-field` throws NG0951 on `inputRef()`, and did the same in kind before the query was a signal. `focus.spec.ts` already documents the timing; the fix is either to guard the write or to defer it until the view is there. Reproduce with a decorated `formidable-input-field` carrying `ngModel` and no `<form>` around it. The portal's preset thumbnails work around it by showing a `placeholder` instead of binding a value.
- Before releasing to npmjs with version 1.0.0, fix the README.md. It's relative links don't work on npmjs.org (https://www.npmjs.com/package/ngx-formidable)
- Before releasing: npm pkg fix would normalize the repository.url warning, and the publish:lib script still has the bare-path bug.

## Features

- Provide a global config for consumer applications with default settings for all fields, such as label position, etc. Otherwise, each single field needs to define these.
- No `--formidable-font-family` token exists. `field-reset` in `mixins/_forms.scss` sets `font: inherit`, so every field takes the host page's family and the library exposes font size, weight and line height only. A consumer who wants the fields on a different face from the page around them has no variable to set. Adding one is a public API change: a token, a `:root` declaration, a `user/theme-reference.md` row, a `src/app/portal/model/token-manifest.ts` entry and a `field-reset` that names the family instead of inheriting it. The portal works around it by declaring `font-family` itself — see `impl/portal.md`.
- The portal ships its font archetypes as stacks over faces the platform already has, not as self-hosted files. `impl/portal.md` calls for bundled, compressed web fonts. The stacks satisfy every reason that design gives — no third-party origin, no flash of unstyled text, works offline and behind a proxy — but they render differently per platform, and a display face in particular has no reliable stand-in. Bundling needs licensed `woff2` files chosen and checked in.
