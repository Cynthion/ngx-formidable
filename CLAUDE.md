# ngx-formidable — Claude Code Reference

## Project Overview

**ngx-formidable** is an Angular 18 form component library. The repo contains:
- `projects/ngx-formidable/` — the publishable library (ng-packagr)
- `src/app/` — a demo/playground app for development

## Key Commands

```bash
npm start                # serve the demo app
npm run build:lib        # build the library (copies README.md + LICENSE first)
npm run publish:lib      # publish dist/ngx-formidable to npm
npm test                 # run tests (Jasmine + Karma)
ng build ngx-formidable  # build library directly
```

## Architecture

### Library entry point
`projects/ngx-formidable/src/public-api.ts` — exports everything public.

### Setup (consumers)
- **Standalone:** `provideNgxFormidable(config?)` in `app.config.ts`
- **NgModule:** `NgxFormidableModule.forRoot(config?)` in `AppModule`

### Field Components
All fields live in `projects/ngx-formidable/src/lib/components/fields/`:
- `InputFieldComponent` — text input with optional masking
- `TextareaFieldComponent` — textarea with optional autosize + length indicator
- `SelectFieldComponent` — native `<select>`
- `DropdownFieldComponent` — custom dropdown panel
- `AutocompleteFieldComponent` — dropdown + filter input (uses fuse.js)
- `DateFieldComponent` — date picker (uses pikaday)
- `TimeFieldComponent` — time input
- `ToggleFieldComponent` — toggle/switch
- `SliderFieldComponent` — range slider with optional tick marks + labels
- `RadioGroupFieldComponent` — radio group
- `CheckboxGroupFieldComponent` — checkbox group

All field components extend `BaseFieldDirective` and implement `IFormidableField`.

### Structural Components
- `FieldDecoratorComponent` — wraps a field with label, tooltip, prefix, suffix, errors (layouts: `single` | `group` | `inline`)
- `FieldOptionComponent` — individual option inside option-based fields
- `FieldErrorsComponent` — renders validation error messages

### Directives
| Directive | Selector | Purpose |
|-----------|----------|---------|
| `FormDirective` | `form[formidableForm]` | Binds a Vest suite to Angular `NgForm` |
| `FormModelDirective` | `[formModel]` | Binds a field to a model property |
| `FormModelGroupDirective` | `[formModelGroup]` | Groups nested form models |
| `FormRootValidateDirective` | — | Root-level validation (cross-field) |
| `FieldLabelDirective` | — | Projects label content into decorator |
| `FieldPrefixDirective` | — | Projects prefix content |
| `FieldSuffixDirective` | — | Projects suffix content |
| `FieldTooltipDirective` | — | Projects tooltip content |
| `FieldErrorsDirective` | — | Projects error display |

### Validation
Uses **[Vest](https://vestjs.dev/)** static suites (`staticSuite`). The `FormDirective`:
- Takes `formValue`, `formFrame`, `formSuite`, `validationConfig` inputs
- Exposes `formValueChange$`, `errorsChange$`, `dirtyChange$`, `validChange$` outputs
- `createAsyncValidator(fieldPath, validationOptions)` — creates Angular async validators from Vest

### Models & Tokens
Key file: `projects/ngx-formidable/src/lib/models/formidable.model.ts`
- `FORMIDABLE_FIELD` — injection token for field components
- `FORMIDABLE_OPTION_FIELD` — injection token for option fields
- `FORMIDABLE_MASK_DEFAULTS` — global ngx-mask config override token
- `FORMIDABLE_ERROR_TRANSLATOR` — injection token for translating error message strings

### Input Masking
Uses **ngx-mask**. Configured via `provideNgxFormidable({ globalMaskConfig: {...} })` or per-field `mask` + `maskConfig` inputs.

## Styling

### Approach
- CSS custom properties for runtime theming (consumers override `--formidable-*` variables)
- SCSS tokens (`_tokens.scss`) as compile-time defaults
- `_formidable-vars.scss` emits `:root` block with defaults

### Consuming styles
Consumers must import:
```scss
@use 'ngx-formidable/styles';
```

### Key style files
- `projects/ngx-formidable/src/lib/styles/_tokens.scss` — all SCSS variable defaults
- `projects/ngx-formidable/src/lib/styles/_formidable-vars.scss` — `:root` CSS custom properties
- `projects/ngx-formidable/src/lib/styles/mixins/_forms.scss` — all field mixins
- `projects/ngx-formidable/src/lib/styles/mixins/_utils.scss` — spacing util (`utils.spacing()`)

### Naming convention
CSS custom properties follow: `--formidable-{category}-{name}` (e.g. `--formidable-color-field-border`)

## Dependencies
- **Angular 18** (forms, animations, router)
- **Vest 5** — form validation
- **ngx-mask** — input masking
- **pikaday** — date picker calendar
- **fuse.js** — fuzzy search for autocomplete
- **date-fns 3** — date formatting/parsing
- **uuid** — field ID generation

## Dev Tools
- **ESLint** (angular-eslint + eslint-plugin-rxjs-x)
- **Stylelint** (stylelint-config-standard-scss)
- **Prettier** (with prettier-plugin-organize-attributes)
- **Karma + Jasmine** — unit tests
- **ng-packagr** — library build

## Node Version
See `.nvmrc` / `.tool-versions` for the required Node version.
