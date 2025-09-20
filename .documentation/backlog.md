# Backlog

Example:

- Update usage documentation according to EnerQi
- suffixes: clear/reset, copy, validation state, loading
- date/time fields: show mask that user provided, not 0
- complex example
- theme 4 should be tweaked to be tiny, and border-radius 0, no background for field groups
- add badges to readme
- exact feature list (per field and component) in readme
- update all dependencies (angular 20)
- tag release commit
- add CONTRIBUTING.md
- logo for ngx-formidable

Improvements:

- remove validation from the library, only provide ui components
- rename FormDirective to NgxFormidableFormDirective. (no naming clash with Angular)
- ARIA attributes

# Bugs:

- autocomplete: when user types the exact value of an option, it should select it
- datefield: when panel open, arrow/left/right moves caret in field
- ios: inspect padding when prefix is missing
