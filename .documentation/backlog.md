# Backlog

## Bugs

- **Six Component Stylesheets Blow The Build Budget**: `ng build` warns on `field-decorator` (4.28 kB over), `dropdown-field`, `date-field`, `autocomplete-field`, `slider-field` and `field-option` against a 10.24 kB per-stylesheet budget. Pre-existing and unrelated to any one phase — every panel-bearing component inlines the whole `panel` mixin family, so the mixins are duplicated per component. Decide whether to raise the budget in `angular.json` or move the shared panel CSS somewhere it is emitted once. Found while shipping Theming Escape Hatches.

## Features
