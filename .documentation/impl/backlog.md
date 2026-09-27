# Backlog

## Bugs

## Features

- **Vitest Spike**: move both test projects from Karma to the `@angular/build:unit-test` builder, whose default runner is Vitest. The open question is the library: its geometry specs need `test-styles.scss` and its caret and panel specs need fake timers, while a library build target carries no `styles`. Try `setupFiles` and a `runnerConfig`, and prove it with the whole library suite passing.
- **Hidden State**: Signal Forms' `hidden()` reaches a field as the `FormUiControl` `hidden` input. The decorator could honour it and hide itself with its field, where today the consumer writes `@if (!form.address().hidden())`.
