# Implementation Roadmap

The source of truth for outstanding work. [`impl/backlog.md`](backlog.md) is the raw intake buffer for new, untriaged ideas; this file is where they land once they are ordered into phases.

- **One Phase, One Conversation**: phases are sized to be finished in a single session. Do not merge them.
- **Delete On Ship**: when a phase ships, its entry here is **deleted**, not annotated. The commit history holds what shipped. See the Definition of Done in [`impl/definition-of-done.md`](definition-of-done.md).
- **No Silent Reordering**: a phase's dependencies are listed with it. Do not start a phase whose dependencies are open.

## Ordering Strategy

- **Bugs First**: defects lead, whichever section they came in under.
- **State Before Style**: a state hook ships before the styling that reads it: border geometry and `aria-invalid` both read the invalid-state hook.
- **Docs Last**: API documentation and the `README.md` pass come after the API stops moving.
- **Portal After The Library**: the portal must expose every field option and theme token, so it starts only once those are stable.

---

## Forms-Agnostic Rewrite

The fields work with Signal Forms, reactive forms and template-driven forms alike, validation belongs to whichever forms API the consumer chose, and the library renders, edits, decorates and themes. Phases 17 to 32 get there.

### Decisions

| Topic          | Decision                                                                                                                                                                                  |
| :------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Field Contract | Every field implements Angular's `FormValueControl<T>`. No field is a `ControlValueAccessor`                                                                                              |
| Validation     | None in the library: the template-driven harness and the Vest entry point go. Rules are Signal Forms rules, a Standard Schema such as Vest, Zod or Valibot, or the classic validators     |
| Messages       | The decorator renders its field's messages. `formidable-field-errors` is presentational, placed by hand for a group, the form or a custom spot                                            |
| Model          | The model is the only source of truth. A field writes only on user interaction and corrects nothing it is given                                                                           |
| Reveal         | `touched` (default), `dirty` or `always`. `submitted` goes: Signal Forms keeps no submitted state, and `submit()` touches every field anyway                                              |
| Value Types    | `string` for input and textarea, `boolean` for toggle, `number` for slider, `string[]` for checkbox-group, `string \| null` for the other option fields, `Date \| null` for date and time |
| Naming         | Angular's current style guide: `input-field.ts`, `InputField`, `FormidableField`, with no `Component` or `Directive` suffix and no `I` prefix                                             |
| Setup          | `provideNgxFormidable()` only. `NgxFormidableModule` goes                                                                                                                                 |
| Studio Export  | Signal Forms only                                                                                                                                                                         |
| Diagrams       | Mermaid, which the portal's `Docs` route renders as well                                                                                                                                  |
| Test Runner    | Karma stays. A Vitest spike is in [`impl/backlog.md`](backlog.md)                                                                                                                         |

### Target Architecture

```mermaid
flowchart LR
  subgraph Api["Consumer's Forms API"]
    SF["Signal Forms<br/>[formField]"]
    RF["Reactive Forms<br/>[formControl]"]
    TD["Template-Driven Forms<br/>ngModel"]
  end
  subgraph Lib["ngx-formidable"]
    Field["Field<br/>FormValueControl"]
    Decorator["Decorator<br/>Label, Marker, Hints, Messages"]
  end
  SF -- "Value, State" --> Field
  RF -- "Value, State" --> Field
  TD -- "Value, State" --> Field
  Field -- "Value, Touch" --> Api
  Field --> Decorator
```

| Concern                                                                  | Owner                                                                              |
| :----------------------------------------------------------------------- | :--------------------------------------------------------------------------------- |
| The model, the value flow, the rules, when they run, submission          | The forms API and the consumer's validator                                         |
| Touched, dirty, errors, pending, disabled, readonly, required            | The forms API, pushed into the field's `FormUiControl` inputs                      |
| Editing, keyboard, masking, panels, ARIA                                 | The field                                                                          |
| Label, required marker, hints, prefix, suffix, messages and their reveal | The decorator, reading its field                                                   |
| Message text                                                             | `FORMIDABLE_ERROR_MESSAGE`, an `(error) => string` defaulting to `message ?? kind` |

- **Field**: `BaseField<T>` holds `value` as a `model()`; the `FormUiControl` inputs, each accepting `undefined` and falling back to the field's default; a `touch` output as the last act of a blur; `focus(options?)`; the library's own `placeholder`, `autoFocus` and `revealOn`; and `showErrors`, derived from the state and the reveal.
- **Decorator**: reads the projected field, and nothing of any forms API.
- **Consumer Convention**: one `*.form.ts` per form holds the model interface, an initial model defining every key (Signal Forms drops an `undefined` one), and the `schema()`. The component holds `form()` over a `signal` of the initial model; the template is `<form [formRoot]>` with decorated fields bound by `[formField]`. The Studio exports exactly this.
- **Validators**: each reaches a field through its forms API, never through the library. The library adds only the message text, the reveal, the placement and the marker, all of it read off the field's state. More sources combine as more rules in one schema, each check with one owner, or a field reports the same failure twice.

| Validator                   | Where It Goes                                                                                                                          | Marks Required                                           |
| :-------------------------- | :------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------- |
| Angular's rules, by default | The `schema()`: `required()`, `email()`, `pattern()`, `maxLength()`; `validate()` across fields; `validateAsync()` or `validateHttp()` | `required()`                                             |
| Zod, Valibot, Vest          | The `schema()`: `validateStandardSchema(path, schema)`, with a Vest suite created per form                                             | Not on its own: `required()`, or `REQUIRED` to mark only |
| A classic `ValidatorFn`     | The `FormControl`, under `[formControl]` or `formControlName`. Its error carries no text, so `FORMIDABLE_ERROR_MESSAGE` maps the kind  | `Validators.required`                                    |
| A directive validator       | Nowhere: no classic API attaches one to a custom control, see **Template-Driven Forms Validate No Field**                              | The `required` attribute                                 |

### Angular Behaviour Relied On

Read off the installed `@angular/forms` and the Angular documentation. The phase named proves each with a spec before any guide states it.

| Behaviour                                                                                                                                                                   | Proven In |
| :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------: |
| `[formField]` prefers a value accessor over a custom control, and the `NgControl` it provides has no `markAs*`, `events` or `valueChanges`                                  |    19     |
| `[formField]` writes the schema's state into same-named inputs: `name`, `readonly`, `disabled`, `required`, `min`, `max`, `minLength`, `maxLength`                          |    19     |
| `ngModel`, `[formControl]` and `formControlName` bind a custom control with no value accessor and forward `touched`, `dirty`, `invalid`, `pending`, `disabled` and `errors` |    19     |
| The classic APIs ignore `updateOn` for a custom control, forward `required` everywhere but under `ngModel`, and never forward `readonly` or `name`                          |  19, 20   |
| `ngModel`, `[formControl]` and `formControlName` attach no directive validator, such as `required` or `minlength`, to a custom control's control, as of 22.2                |    19     |
| A classic error reaches a custom control as `{ kind, context }`, with no `message`                                                                                          |    20     |
| `transformedValue` reports parse errors to all three APIs. `ngModel` and `[formControl]` hand one to the field only on the host's next check                                |    24     |
| A Vest suite is a Standard Schema, and an async Vest test does not surface through it                                                                                       |    26     |
| A Standard Schema issue whose path names no field reports on the root, and one whose path runs through a key the model lacks throws                                         |    26     |
| A Zod schema is a Standard Schema, and a refinement reports on the path it names                                                                                            |    28     |

### Accepted Compromises

- **`updateOn` In The Classic APIs**: `blur` and `submit` no longer hold back a library field's value. Signal Forms' `debounce(path, 'blur')` does, through `touch`.
- **Template-Driven Forms Validate No Field**: Angular 22.2 attaches no directive validator, such as `required` or `minlength`, to a custom control, so no validator declared in a template reaches a library field under `ngModel`. The `required` attribute still marks, because it also matches Angular's `RequiredValidator`. To validate, a consumer uses Signal Forms or reactive forms, until the upstream fix in [`impl/backlog.md`](backlog.md).
- **Required Checkbox Group**: Signal Forms' `required()` does not count `[]` as empty, so the guide pairs it with `minLength(path, 1)`.

### Integration Branch

- **One Branch**: `feature/signal-forms-support` collects Phases 17 to 32. `main`, the deployed portal and the published package stay on the last beta until Phase 32.
- **Phase Branches**: each phase branches off it and returns through a pull request with every CI gate of [`impl/definition-of-done.md`](definition-of-done.md) green.
- **Test First**: each phase opens with behaviour specs that fail: DOM, ARIA and model assertions through a host that binds the field with a forms API.
- **Interim Portal**: it builds and passes its tests at every phase.
- **Interim Guides**: [`user/components.md`](../user/components.md) follows every public change in the same phase; the guides are rewritten once, in Phase 31.
- **This Section**: deleted with Phase 32, once Phase 31 has moved what holds into `user/`. What holds for maintainers is in [`tech/forms-integration.md`](../tech/forms-integration.md).

---

## Library Phases

### Phase 32: Release

**Depends On**: nothing.

- **Merge**: the integration branch into `main`, through a pull request with every CI gate green.
- **Version**: `1.0.0` in `projects/ngx-formidable/package.json`. The Angular peer floor is the minor CI tests, per [`impl/renovate.md`](renovate.md).
- **Publish**: `npm run screenshots` for the README hero, then [`impl/releasing.md`](releasing.md).
- **Tag**: tag the release commit. Final step.

### Phase 33: Storybook

- **Set It Up**: Storybook is not installed. Take conventions from the sibling project's `storybook.md` and its `.storybook` configuration first. Copy it into this repo from EnerQi repository.
- **Stories**: all components, including the layout options.
- demonstrate all fields, directives and decorator, including their properties.

### Phase 34: Date Range Field

- **The Calendar Is Not The Problem**: Pikaday renders ranges, with `startRange` / `endRange` options and `is-inrange` / `is-startrange` / `is-endrange` classes. What it does not do is manage range _selection_; that is driven from `onSelect`, or with two instances.
- **The Value Contract Is**: `date-field` is single-valued end to end: `Date | null`, one picker, one masked input with one `unicodeTokenFormat`, arrow-stepping over that one date, and `isFilled`. A range mode means a tuple value, a two-segment mask, parse and format path, per-segment arrow-stepping and clear semantics, and range styling that `_pikaday.scss` does not have.
- **Size It Honestly**: the largest single item on this roadmap. Split it before starting.

### Phase 35: AI Support

I want to support developers to use AI to use this library. How can I do that? Should that be done with an MCP? What are other ways?

### Phase 36: Blog Post

- **Where**: `https://thedevexchange.com/`, the company dev blog.
- **What**: the library, its features, and how it is used to build beautiful, functional Angular forms. Code examples, screenshots, links to the portal and the GitHub repository. Why it beats other form libraries, and a call to action to try it.
- **Interview First**: interview me before writing, to get my perspective on the library, its development process and its roadmap. The narrative comes out of that, not out of the code.
- **Tone**: humorous and light, informative and professional. Conversational, so the reader feels part of the journey.
- **Include A Lessons-Learned Section**: the challenges hit during development and how they shaped the library's design. That is what gives readers the thinking behind the features.
