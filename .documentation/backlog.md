# Backlog

- rename libary to `formidable`
- add an overwriteable FormzConfig (e.g., `inputDebounceTime`)
- remove all `cmp` prefixes
- support showing multiple errors
- resolve all TODOs
- dropdown: write towards selection
- check safari/firefox/edge
- introduce a secondary color (date day label)
- support disabled and readonly for all fields (dropdown, autocomplete, date):
  - selectOption(option: IFormzFieldOption): void {
    if (this.readOnly || this.disabled || option.disabled) return; }
- browser errors/warnings:
  - The label's for attribute doesn't match any element id. This might prevent the browser from correctly autofilling the form and accessibility tools from working correctly.
- textarea: show maxLength counter
- suffixes: clear/reset, copy, validation state, loading
- `fieldset` & `legend` for fieldset
- validation error: styling
- styling for field options based on layout (single vs. group)
- support patterns (ngx-mask)
- <input> value & checked could be added to interface, if used withouth FormControl
- sortFn for options
- use rem instead of px
- use 'null' for empty values in all fields, instead of null
- use arrow up/down css icons for dropdown
- scrollIntoView upon panel close
- date field: on clicking the toggle, gain focus for key navigation, but make sure the panel buttons can be used also
