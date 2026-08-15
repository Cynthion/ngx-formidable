# Backlog

## Bugs

- **Six Component Stylesheets Blow The Build Budget**: `ng build` warns on `field-decorator` (4.28 kB over), `dropdown-field`, `date-field`, `autocomplete-field`, `slider-field` and `field-option` against a 10.24 kB per-stylesheet budget. Pre-existing and unrelated to any one phase — every panel-bearing component inlines the whole `panel` mixin family, so the mixins are duplicated per component. Decide whether to raise the budget in `angular.json` or move the shared panel CSS somewhere it is emitted once. Found while shipping Theming Escape Hatches.

- **An Unbound Model Validates Nothing**: `createAsyncValidator` returns `of(null)` while `formValue` is null, so a form whose model arrives through `| async` reports valid until the first emission, with no field ever validated. Decide whether the live control values are enough to validate against on their own. Found while specifying validation timing.

- **A Programmatic Write Marks The Control Dirty**: Angular sets `_pendingDirty` on every `onChange`, and a control value accessor cannot write a value without one. So `writeValue` of a `Date`, `slider-field`'s clamp write-back and the masked `doWriteValue` re-notify all leave the control dirty with no user interaction, which reveals messages under `revealOn="dirty"` on a field nobody has visited. The touch on those paths is already suppressed; the dirty flag is not. Found while implementing validation timing.
- **A Dropped Selection Is Never Deselected**: in `dropdown-field` and `radio-group-field`, `updateOptions` calls `writeValue` and clears `selectedOption` before `reconcileSelectionAgainstOptions` reads it, so the `if (!this.selectedOption) return;` guard always fires and `deselectOption` is unreachable. The model keeps a value the options no longer offer. `checkbox-group-field` reconciles off `_writtenValues` instead and is unaffected. Found while implementing validation timing.

## Features
