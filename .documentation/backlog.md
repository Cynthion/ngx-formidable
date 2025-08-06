# Backlog

- support showing multiple errors
- support disabled and readonly for all fields (dropdown, autocomplete, date):
  - selectOption(option: IFormidableFieldOption): void {
    if (this.readOnly || this.disabled || option.disabled) return; }
- browser errors/warnings:
  - The label's for attribute doesn't match any element id. This might prevent the browser from correctly autofilling the form and accessibility tools from working correctly.
- suffixes: clear/reset, copy, validation state, loading
- - textarea height
- support patterns (ngx-mask)

# Future Releases:

- make validation interface generic, so that any validation library can be used (instead of vest)
