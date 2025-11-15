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

- Move the FieldErrorsComponent rendering into Decorator (doesn't work for inline)
- Toggle: allow setting layout to 'inline' or 'group'
- remove validation from the library, only provide ui components
- rename FormDirective to NgxFormidableFormDirective. (no naming clash with Angular)
- ARIA attributes
- update ngx-formidable from EnerQi:
  - add form.model.ts (NEW)
  - form-root-valudate.directive.ts
  - form.direvtive.ts
  - form-validate.helpers.ts

# Bugs:

- add --formidable-color-field-group-background-readonly and -disabled
- datefield: when panel open, arrow/left/right moves caret in field
- ios: inspect padding when prefix is missing
