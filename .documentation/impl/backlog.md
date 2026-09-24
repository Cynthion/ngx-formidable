# Backlog

## Bugs

- A standalone `ngModel` — one outside a `<form>` — sets up its control synchronously from `NgModel.ngOnChanges`, which is before the field's own view exists. Every field whose `doWriteValue` reaches for a view ref therefore crashes: `input-field` throws NG0951 on `inputRef()`, and did the same in kind before the query was a signal. `focus.spec.ts` already documents the timing; the fix is either to guard the write or to defer it until the view is there. Reproduce with a decorated `formidable-input-field` carrying `ngModel` and no `<form>` around it. The portal's preset thumbnails work around it by showing a `placeholder` instead of binding a value.

- EnerQi reports this, fix it: `ngx-formidable` pins five dependencies through its peer ranges, so they could not move with the Angular upgrade: `date-fns` (3.x, 4.x exists), `ngx-mask` (19.x, 22.x exists), `vest` (5.x, 6.x exists), `pikaday` and `uuid`. They unblock when `ngx-formidable` widens those peers. I want ngx-formidable to be usable as openly as possible. Also update Angular version, if there is a newer version.
- Before releasing to npmjs with version 1.0.0, fix the README.md. It's relative links don't work on npmjs.org (https://www.npmjs.com/package/ngx-formidable)
- Before releasing: npm pkg fix would normalize the repository.url warning, and the publish:lib script still has the bare-path bug.

## Features

- Add Renovate, group dependencies that change together, so that dependencies that change together or have to be changed together are grouped appropriately. Add renovate documentation. The creation of less PRs is desired. The creation of PRs that will work is the goal. Replace ?dependency-check.yml` with it.
- Provide a global config for consumer applications with default settings for all fields, such as label position, etc. Otherwise, each single field needs to define these.
