# Backlog

- rename libary to `formidable`
- base class for all fields (id, etc.)
- extract common functionalities into helpers
- add an overwriteable FormzConfig (e.g., `inputDebounceTime`)
- remove all `cmp` prefixes
- automatically add `name` property on fields based on vm?
- support showing multiple errors
- resolve all TODOs
- fix valuedChange$ and focusedChange$ in all fields
- handle switch case defaults
- support readonly for all fields (dropdown, autocomplete, date)
- dropdown: write towards selection
- left/right panel options in interface
- check safari/firefox/edge
- introduce a secondary color (date day label)
- datefns needed?
- selectOption(option: IFormzFieldOption): void {
  if (this.readOnly || this.disabled || option.disabled) return; }
- panel below/above field
- browser errors/warnings:
  - The label's for attribute doesn't match any element id. This might prevent the browser from correctly autofilling the form and accessibility tools from working correctly.
- testarea: show maxLength counter
- suffixes: clear/reset, copy, validation state, loading
- `fieldset` & `legend` for fieldset
- validation error: styling
- styling for field options based on layout
- support patterns (ngx-mask)
- <input> value & checked could be added to interface, if used withouth FormControl
- add support for `ReactiveForms`
- sortFn for options
- combine inline & projected options:

  ````
  <ng-container *ngIf="option.template; else labelContent" [ngTemplateOutlet]="option.template"></ng-container>
  <ng-template #labelContent>{{ option.label || option.value }}</ng-template>
  ```
  ````
