# Backlog

## Bugs

- An option's `select` never reaches the rendered option. Every option field re-creates its options from the plain list and binds `[value]`, `[label]`, `[readonly]`, `[disabled]`, `[selected]`, `[highlighted]` and — on the autocomplete only — `[match]`. It does not bind `[select]`, so a `select` a consumer sets on a projected `formidable-field-option` or on an `options` entry is carried in the plain option and then dropped: the rendered option always falls back to its own default. Either bind it or drop `select` from `IFormidableOption`.

## Features
