# Backlog

- resolve all TODOs
- rename libary to `formidable`
- support showing multiple errors
- dropdown: write towards selection
- dropdown: with <input>, setCaretPosition
- support disabled and readonly for all fields (dropdown, autocomplete, date):
  - selectOption(option: IFormzFieldOption): void {
    if (this.readOnly || this.disabled || option.disabled) return; }
- browser errors/warnings:
  - The label's for attribute doesn't match any element id. This might prevent the browser from correctly autofilling the form and accessibility tools from working correctly.
- suffixes: clear/reset, copy, validation state, loading
- <input> value & checked could be added to interface, if used without FormControl
- sortFn for options
- support patterns (ngx-mask)
- use 'null' for empty values in all fields, instead of null
- scrollIntoView upon panel close
- hold key -> doesn't write
