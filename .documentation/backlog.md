# Backlog

- add an overwriteable FormzConfig (e.g., `inputDebounceTime`)
- remove all `cmp` prefixes
- automatically add `name` property on fields based on vm?
- try removing the `formzFormField` directive in consumer
- support showing multiple errors
- resolve all TODOs
- fix valuedChange$ and focusedChange$ in all fields
- handle switch case defaults
- extract common functionalities into helpers
- support readonly for all fields (dropdown, autocomplete, date)
- implement dropdown also with inner/wrapped input?
- dropdown: write towards selection
- remove moment.js from pikaday package (via patch-package patches)
- left/right panel options in interface
- allow user to externally style pikaday
- The label's for attribute doesn't match any element id. This might prevent the browser from correctly autofilling the form and accessibility tools from working correctly.
- check safari/firefox/edge
- introduce a secondary color (date day label)
- datefns needed?
- selectOption(option: IFormzFieldOption): void {
  if (this.readOnly || this.disabled || option.disabled) return; }
- panel below/above field
- browser errors/warnings
- radioGroup keyboard navigation
- FIX: initial value not properly set in radioGroup
