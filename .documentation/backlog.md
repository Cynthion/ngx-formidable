# Backlog

Example:

- Update usage documentation according to EnerQi
- suffixes: clear/reset, copy, validation state, loading
- date/time fields: show mask that user provided, not 0
- fromGroup example
- complex example
- theme 4 should be tweked to be tiny, and border-radius 0
- add badges to readme
- proof-read readme
- exact feature list (per field and component) in readme
- update all dependencies (angular 20)
- tag release commit
- add CONTRIBUTING.md
- logo for ngx-formidable
- remove vest directives/components and only provide ui components, also adapt readme

Improvements:

- ARIA attributes
- rename FormDirective to NgxFormidableFormDirective. (no naming clash with Angular)
- in tokens, use var(--formidable-...) instead of $formidable...?
- keyboard-navigation: skip disabled/readonly options
- fix representation of readonly/disabled state (dropdown, autocomplete, date, time)
- don't show option as selected when unfocused (see radio/checkbox)

# Bugs:

- datefield: when panel open, arrow/left/right moves caret in field
- ios: inspect padding when prefix is missing
