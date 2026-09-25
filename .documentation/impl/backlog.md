# Backlog

## Bugs

- A standalone `ngModel` — one outside a `<form>` — sets up its control synchronously from `NgModel.ngOnChanges`, which is before the field's own view exists. Every field whose `doWriteValue` reaches for a view ref therefore crashes: `input-field` throws NG0951 on `inputRef()`, and did the same in kind before the query was a signal. `focus.spec.ts` already documents the timing; the fix is either to guard the write or to defer it until the view is there. Reproduce with a decorated `formidable-input-field` carrying `ngModel` and no `<form>` around it. The portal's preset thumbnails work around it by showing a `placeholder` instead of binding a value.

- Before releasing to npmjs with version 1.0.0, fix the README.md. It's relative links don't work on npmjs.org (https://www.npmjs.com/package/ngx-formidable)
- Before releasing: npm pkg fix would normalize the repository.url warning, and the publish:lib script still has the bare-path bug.

## Features
