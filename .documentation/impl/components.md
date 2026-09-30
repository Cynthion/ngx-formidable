# Components

Placement, naming, selectors, the field contract and the signal API of components and directives. Structure and key paths are in [`tech/architecture.md`](../tech/architecture.md); the public API is catalogued in [`user/components.md`](../user/components.md).

## Placement

| Kind                         | Goes To                                                     | Selector            | Published |
| :--------------------------- | :---------------------------------------------------------- | :------------------ | :-------: |
| Library field                | `projects/ngx-formidable/src/lib/components/fields/<name>/` | `formidable-<name>` |    Yes    |
| Library structural component | `projects/ngx-formidable/src/lib/components/<name>/`        | `formidable-<name>` |    Yes    |
| Portal example               | `src/app/example-<name>/`                                   | `example-<name>`    |    No     |
| Portal component             | `src/app/portal/<area>/<name>/`                             | `portal-<name>`     |    No     |

- **Folder Placement**: `directives/` holds only the `formidableField*` attribute directives that decorate a field. Test-only code goes in a `testing/` folder and stays unreachable from `public-api.ts`, which is what keeps ng-packagr from compiling it.
- **Examples Must Be Reachable**: `tsconfig.app.json` compiles only what `src/main.ts` reaches, so an example nothing imports is never compiled.
- **Selector Prefixes**: enforced per path by `eslint.config.js` — `formidable` under `projects/ngx-formidable/src/lib`, `portal` under `src/app/portal`. The two directives that deliberately hijack Angular's own selectors (`[ngModel]`, `[ngModelGroup]`) and the test-only stub carry an inline waiver naming the reason.

---

## Components And Directives

- **Framework Defaults**: never set `standalone` or `changeDetection` — standalone and `OnPush` are Angular's defaults, and `prefer-on-push-component-change-detection` rejects an explicit `OnPush`. Nothing calls `markForCheck()`: state a template reads is a signal, and the read is what marks the view. The one exception is `BaseDateTimeField`, because `ngModel` and `[formControl]` hand a field its parse error only on the host's next check.
- **Zoneless**: the library holds no `NgZone` and the portal runs on Angular's default zoneless change detection. State a template **or a host binding** reads must therefore be a signal — a template listener or an output emission marks the whole ancestor chain, while a signal write marks only the views that read it, and a plain field written from a callback Angular does not own marks nothing at all.
- **Selectors**: components are elements, kebab-case, `formidable-` prefix (`formidable-input-field`). Field-decoration directives are attributes, camelCase, `formidable` prefix (`[formidableFieldLabel]`).
- **File Naming**: Angular's style guide — a file is named after the class it holds, kebab-case, with no type suffix: `input-field.ts` holds `InputField`, `field-label.ts` holds `FieldLabel`. A component is a folder with its `.html` and `.scss` beside the `.ts`, never an inline template or style; a directive is a single file.
- **Class Naming**: no `Component` or `Directive` suffix (`InputField`, `FieldDecorator`) and no `I` prefix (`FormidableField`). Where two classes would share a name, the one that is not the public component is named for what it does.
- **Prefix**: the library's vocabulary is `Field*`, `*Field`, `Formidable*` and `FORMIDABLE_*`. `NgxFormidable` names only the setup: `provideNgxFormidable` and `NgxFormidableConfig`.
- **Symmetry**: a field mirrors its siblings — input and output order, the provider block, template attribute order.

---

## Field Contract

- Field components extend `BaseField<T>`, which implements Angular's `FormValueControl<T>`, declare their `value` as a `model()` and register `FORMIDABLE_FIELD` (`useExisting`). The `value` model is what makes every forms API bind them — none is a `ControlValueAccessor` — and the provider is what lets `FieldDecorator` discover them.
- A field renders from `value()` and writes it only through `setValue()` on a user's edit. It never corrects what the model holds — no clamping, re-masking or reconciling against the options.
- Option-based fields additionally collect options with `contentChildren(FORMIDABLE_OPTION, { descendants: true })` and provide `FORMIDABLE_OPTION_FIELD`. `descendants` is what lets an option sit inside a wrapper element; a shallow query already reaches into `@for` / `*ngIf` / `<ng-template>`. No field declares the query itself: all five take it — with the option inputs and the option lifecycle — from `BaseOptionListField`. The four that walk their list with a highlight take the highlight and its keys from `BaseOptionField` on top; `select-field` does not, because a native `<select>` has no highlight.
- `BaseField` is the extension point for custom fields; `example-counter-field` in the portal is the reference implementation, quoted as the worked example in [`user/custom-fields.md`](../user/custom-fields.md). The full contract is documented in [`user/components.md`](../user/components.md).

---

## Signal API

Components and directives declare their API with signal functions. The decorator forms are lint errors (`prefer-signals`, `prefer-signal-model`, `prefer-output-emitter-ref`, `prefer-output-readonly`, `no-uncalled-signals`, `reactive-context-must-read-signal` in `eslint.config.js`).

| Concern                | Convention                                                                            |
| :--------------------- | :------------------------------------------------------------------------------------ |
| Input                  | `input()`, `input.required()`; coercion through `input(x, { transform })`; no aliases |
| Two-Way                | `model()` — never an `input()` plus an `xChange` `output()`                           |
| Output                 | `output()`; `outputFromObservable()` to expose an existing `Observable`               |
| Queries                | `viewChild()`, `viewChildren()`, `contentChild()`, `contentChildren()`                |
| Derived Value          | `computed()`                                                                          |
| Resettable Local State | `linkedSignal()` seeded by an input                                                   |
| Reaction               | `effect()`, or `afterRenderEffect()` when the reaction reads or writes the DOM        |
| Template Narrowing     | `@if (item(); as item)` — a signal call is not narrowed, so the block reads the alias |
| Programmatic Input     | `ComponentRef.setInput()` — an input signal is read-only                              |
| Host Binding           | `host` metadata — never `@HostBinding` or `@HostListener`                             |

- **Two Writers**: where an input has a second writer, the input keeps the public name and the effective value is a `linkedSignal` beside it under its own name. Nothing ever writes to an input.
- **Reacting To A Change Only**: no `ngOnChanges`. `onSignalChange()` from `helpers/utility.helpers.ts` where the work must not run on the first pass — the equivalent of the `!change.firstChange` guard.
- **Observable Naming**: append `$` (`pending$`, `idle$`).

Templates use self-closing tags for elements without content, `[class]` or `[style]` bindings instead of `ngClass` or `ngStyle`, and `[ngTemplateOutlet]` rather than `*ngTemplateOutlet`. A component imports the directives its template uses, never `CommonModule`. The lint rules are `prefer-host-metadata-property`, `prefer-self-closing-tags`, `prefer-class-binding` and `prefer-style-binding`.
