# Components

Placement, selectors, the field contract and the signal API of components and directives. Structure and key paths are in [`tech/architecture.md`](../tech/architecture.md); the public API is catalogued in [`user/components.md`](../user/components.md).

## Placement

| Kind                         | Goes To                                                     | Selector            | Published |
| :--------------------------- | :---------------------------------------------------------- | :------------------ | :-------: |
| Library field                | `projects/ngx-formidable/src/lib/components/fields/<name>/` | `formidable-<name>` |    Yes    |
| Library structural component | `projects/ngx-formidable/src/lib/components/<name>/`        | `formidable-<name>` |    Yes    |
| Portal example               | `src/app/example-<name>/`                                   | `example-<name>`    |    No     |
| Portal component             | `src/app/portal/<area>/<name>/`                             | `portal-<name>`     |    No     |

- **Folder Placement**: `directives/` holds only the `formidableField*` attribute directives that decorate a field; the form-level directives and their helpers live in `forms/`. Test-only code goes in a `testing/` folder and stays unreachable from `public-api.ts`, which is what keeps ng-packagr from compiling it.
- **Examples Must Be Reachable**: `tsconfig.app.json` compiles only what `src/main.ts` reaches, so an example nothing imports is never compiled.
- **Selector Prefixes**: enforced per path by `eslint.config.js` — `formidable` under `projects/ngx-formidable/src/lib`, `portal` under `src/app/portal`. The two directives that deliberately hijack Angular's own selectors (`[ngModel]`, `[ngModelGroup]`) and the test-only stub carry an inline waiver naming the reason.

---

## Components And Directives

- **Standalone**: every component and directive is standalone
- **Change Detection**: every component uses `ChangeDetectionStrategy.OnPush`, with no exception and no `prefer-on-push-component-change-detection` waiver. Nothing calls `markForCheck()`: state a template reads is a signal, and the read is what marks the view.
- **Zoneless**: the library holds no `NgZone` and the portal runs on Angular's default zoneless change detection. State a template **or a host binding** reads must therefore be a signal — a template listener or an output emission marks the whole ancestor chain, while a signal write marks only the views that read it, and a plain field written from a callback Angular does not own marks nothing at all.
- **Selectors**: components are elements, kebab-case, `formidable-` prefix (`formidable-input-field`). Field-decoration directives are attributes, camelCase, `formidable` prefix (`[formidableFieldLabel]`, `form[formidableForm]`). Two directives intentionally hijack Angular's own selectors — `NgxFormidableFieldValidateDirective` on `[ngModel]` and `NgxFormidableGroupValidateDirective` on `[ngModelGroup]` — so they attach to every model-bound control (they no-op outside a formidable form).
- **File Naming**: components are folders with external `*.component.ts` / `.html` / `.scss` (never inline templates or styles). Directives are single `*.directive.ts` files. The shared bases are `base-field.directive.ts` and `base-option-field.directive.ts`. Filenames drop the `NgxFormidable` prefix (`field-validate.directive.ts`, not `ngx-formidable-field-validate.directive.ts`) — consumers import from the package root, so the prefix would only add path noise.
- **Class Naming**: every form-level directive carries the `NgxFormidable` prefix (`NgxFormidableFormDirective`, `NgxFormidableFieldValidateDirective`, `NgxFormidableGroupValidateDirective`, `NgxFormidableWholeFormValidateDirective`, `NgxFormidableVestValidatorDirective`). That family is what overlaps Angular's own namespace (`FormGroupDirective`, `FormControlDirective`, `NgForm`), so an unprefixed name would read as if it came from `@angular/forms`. Everything else keeps the library's own vocabulary unprefixed — `Field*`, `*FieldComponent`, `IFormidable*`, `FORMIDABLE_*` — because none of it overlaps.
- **Symmetry**: a field mirrors its siblings — input and output order, the provider block, template attribute order.

---

## Field Contract

- Field components extend `BaseFieldDirective<T>` and register two providers: `NG_VALUE_ACCESSOR` (via `forwardRef`, `multi: true`) and `FORMIDABLE_FIELD` (`useExisting`) — this is what makes them work with `ngModel` and be discovered by `FieldDecoratorComponent`.
- Option-based fields additionally collect options with `contentChildren(FORMIDABLE_OPTION, { descendants: true })` and provide `FORMIDABLE_OPTION_FIELD`. `descendants` is what lets an option sit inside a wrapper element; a shallow query already reaches into `@for` / `*ngIf` / `<ng-template>`. The four that walk their list with a highlight take the query — and the option inputs, the option lifecycle and the highlight itself — from `BaseOptionFieldDirective` instead of declaring it; only `select-field` still declares its own, because a native `<select>` has no highlight.
- `BaseFieldDirective` is the extension point for custom fields; `example-counter-field` in the portal is the reference implementation, quoted as the worked example in [`user/custom-fields.md`](../user/custom-fields.md). The full contract is documented in [`user/components.md`](../user/components.md).

---

## Inputs, Outputs And Observables

- **Inputs**: signal `input()` throughout, with no aliases
- **Two Writers**: where an input has a second writer, the input keeps the public name and the effective value is a `linkedSignal` beside it under its own name. Nothing ever writes to an input.
- **Outputs**: signal `output()`; a form-level output over an existing observable uses `outputFromObservable()`
- **Observable Naming**: append `$` (`valueChange$`, `formValueChange$`)
- **Setting An Input From Code**: `componentRef.setInput(name, value)`
- **Queries**: signal `viewChild()` / `viewChildren()` / `contentChild()` / `contentChildren()` throughout. There is no `static` flag and none is needed — the result is materialized on read, so it is available from `ngOnInit` onward
- **Reacting To An Input**: no `ngOnChanges`. An `effect()` where the work must also run on the first pass, `onSignalChange()` from `helpers/utility.helpers.ts` where it must not — the equivalent of the `!change.firstChange` guard
- **State A Template Reads**: a `signal` or a `computed`, never a plain field. That is what marks the view, and it is the only thing that does
