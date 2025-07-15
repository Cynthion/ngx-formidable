# Backlog

- rename libary to `formidable`
- add an overwriteable FormzConfig (e.g., `inputDebounceTime`)
- remove all `cmp` prefixes
- support showing multiple errors
- resolve all TODOs
- dropdown: write towards selection
- check safari/firefox/edge
- introduce a secondary color (date day label)
- datefns needed?
- support disabled and readonly for all fields (dropdown, autocomplete, date):
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
- interface for togglePanel()
