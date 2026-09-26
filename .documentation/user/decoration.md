# Decoration

`formidable-field-decorator` wraps a field and everything that belongs around it — a label, an adornment beside that label, a prefix, a suffix, hints and the error messages. It finds the field itself, so the only thing to get right is which slot each element goes in.

```html
<formidable-field-decorator>
  <formidable-input-field
    formidableFieldErrors
    name="amount"
    ngModel />
  <div formidableFieldLabel>Amount</div>
  <div formidableFieldLabelAdornment>?</div>
  <div formidableFieldPrefix>CHF</div>
  <div formidableFieldSuffix>.00</div>
  <div formidableFieldHint>Excluding VAT</div>
</formidable-field-decorator>
```

| Slot                            | Holds                                       | Options                                                |
| :------------------------------ | :------------------------------------------ | :----------------------------------------------------- |
| `formidableFieldLabel`          | The field's label                           | `position`, six values                                 |
| `formidableFieldLabelAdornment` | Anything beside the label                   | —                                                      |
| `formidableFieldPrefix`         | Content at the field's leading edge         | `align`: `center` or `value`                           |
| `formidableFieldSuffix`         | Content at the field's trailing edge        | `align`: `center` or `value`                           |
| `formidableFieldHint`           | Always-visible support text below the field | `align`: `start`, `center` or `end`                    |
| `formidableFieldErrors`         | Validation messages, on the field itself    | `revealOn` — see [`user/validation.md`](validation.md) |

A field works without a decorator. It then has no label, no adornments, no hints and no invalid styling; `formidableFieldErrors` still renders its messages beside the control.

---

## Layouts

The field picks the layout, not the consumer, and the layout decides where the slots land.

```text
horizontal — input, textarea, select, dropdown, autocomplete, date, time

   Label  Adornment                          the label's own row
  ┌────────────────────────────────────┐
  │ Prefix     value          Suffix   │     prefix and suffix inset the value
  └────────────────────────────────────┘
   Hints
   Errors

horizontal, with the label over the field (inside, inside-placeholder, inside-floating, border, border-prefix)

  ┌────────────────────────────────────┐     the label moves into the field, and
  │ Prefix     Label…         Suffix   │     the adornment goes with its row
  └────────────────────────────────────┘
   Hints
   Errors

vertical — radio-group, checkbox-group, slider

   Label  Adornment
  ┌────────────────────────────────────┐
  │ ▢ Option                           │     no prefix or suffix here
  │ ▢ Option                           │
  └────────────────────────────────────┘
   Hints
   Errors

inline — toggle

  Label  Adornment    Prefix [-] Suffix
   Hints
   Errors
```

The `vertical` layout stacks its options inside the field's box, which leaves a prefix or suffix nothing to sit beside and no value to inset, so those two slots are not rendered there at all. The hint row and the errors sit below the field in all three layouts alike.

---

## Labels

`position` chooses where the label renders. The six values are mutually exclusive and set statically.

| Position             | Renders                                                                                                                  |
| :------------------- | :----------------------------------------------------------------------------------------------------------------------- |
| `outside`            | Above the field, in normal document flow. Never moves. The value stays centred in the field.                             |
| `inside` (default)   | Inside the field: resting like a placeholder while the field is visually empty, floating above the value once it is not. |
| `inside-placeholder` | As `inside`, but the resting label takes the placeholder's place and hides it until focus floats the label.              |
| `inside-floating`    | Inside the field, always floating above the value.                                                                       |
| `border`             | Centred on the field's top border, which it hides behind itself. The value stays centred, as with `outside`.             |
| `border-prefix`      | As `border`, but aligned with a projected prefix instead of with the value.                                              |

```html
<div
  formidableFieldLabel
  [position]="'border'">
  Amount
</div>
```

To set one position for every label in an app, see [`user/getting-started.md`](getting-started.md). The [Specimen](https://cynthion.github.io/ngx-formidable/#/specimen) shows every position on every field that honours it, empty and filled.

Four rules follow from the table:

- **Only The `horizontal` Layout Has Room Over The Field.** Every position other than `outside` is therefore a no-op for the toggle, slider and the two group fields — their label always renders outside.
- **A Label Rests Only While Nothing Occupies The Value Area.** A value, visible mask slots, `readonly` and `disabled` each make it float instead.
- **`inside` And `inside-placeholder` Differ Only Over The Placeholder.** `inside` yields the value area to it, so a field with a `placeholder` floats its label throughout; `inside-placeholder` hides the placeholder behind the resting label until focus.
- **A Label Over The Field Stays On One Line And Ellipsizes.** It follows the value's insets, so a prefix, a suffix or a panel toggle pushes it in rather than colliding with it.

### The Label Adornment

An adornment decorates the label, so it lives and dies with the label's row: every position other than `outside` takes that row away, and the adornment with it. The library owns the slot and never its content — a help icon, a tooltip trigger, a counter, whatever belongs beside that label.

```html
<div formidableFieldLabel>Password</div>
<div formidableFieldLabelAdornment>
  <my-tooltip text="At least twelve characters."></my-tooltip>
</div>
```

### The Required Marker

`markRequired` on the **field** suffixes a marker to its label, in every label position:

```html
<formidable-field-decorator>
  <formidable-input-field
    name="firstName"
    [markRequired]="true"
    ngModel />
  <div formidableFieldLabel>First Name</div>
</formidable-field-decorator>
```

`hideRequiredMarkers` on the `<form>` withholds the glyph from every field on it, so one switch decides whether this form marks its required fields at all.

- **The Glyph Is A Variable.** `--formidable-label-required-marker` holds it, so a theme swaps `*` for a word — `' (required)'` — without touching markup.
- **It Inherits The Label's Colour**, and so follows every field state with it.
- **It Is Never What Gets Cut Off.** The marker is a sibling of the projected label, so a label too long to fit ellipsizes its own text and the marker survives.
- **It Validates Nothing.** It marks the label and sets `aria-required`, nothing more. Which validator decides the field is invalid stays entirely yours — see [`user/validation.md`](validation.md).

---

## Prefixes And Suffixes

A prefix sits at the field's leading edge and a suffix at its trailing edge, both insetting the value so it never runs under them. Available in the `horizontal` and `inline` layouts.

### Alignment

Each slot picks what it follows vertically:

| `align`            | Follows                                                              |
| :----------------- | :------------------------------------------------------------------- |
| `center` (default) | The centre of the field's box, wherever the value happens to sit.    |
| `value`            | The value, which an `inside` or `inside-floating` label pushes down. |

```html
<div
  formidableFieldPrefix
  [align]="'value'">
  CHF
</div>
```

The two differ only where a label sits over the value — with an `outside` or `border` label the value is already centred, so `value` changes nothing. A field that top-aligns its value, like the textarea, always aligns with it and ignores the setting.

### Actions

A prefix and a suffix are click-through, so a text adornment over the field's edge still focuses the field. A projected `button` or `a` is the exception — it takes the click, which is all a clear, copy, retry or loading action needs. The library ships no such components: it is your button, your icon, your label.

Two things every action needs:

- **`type="button"`** — otherwise it submits the form it sits in.
- **`(mousedown)="$event.preventDefault()"`** — keeps focus on the field, and stops a panel field closing its panel underneath the click.

The decorator re-measures its slots whenever their width changes, so an action that appears, disappears or swaps its content re-insets the field on its own. There is no refresh call, because none is needed.

**Clear** — the button only exists while there is something to clear:

```html
<div formidableFieldSuffix>
  <button
    *ngIf="model.firstName"
    type="button"
    (mousedown)="$event.preventDefault()"
    (click)="model.firstName = ''">
    &times;
  </button>
</div>
```

**Copy**:

```html
<div formidableFieldSuffix>
  <button
    type="button"
    [disabled]="!model.iban"
    (mousedown)="$event.preventDefault()"
    (click)="clipboard.writeText(model.iban)">
    Copy
  </button>
</div>
```

**Validation state** — a glyph, not a control, so it stays click-through:

```html
<div formidableFieldSuffix>
  <span [class.invalid]="errors['email']">{{ errors['email'] ? '✗' : '✓' }}</span>
</div>
```

**Loading** — bound to whatever flag your own async work sets:

```html
<div formidableFieldSuffix>
  <span
    *ngIf="isLookingUp"
    class="spinner"></span>
</div>
```

---

## Hints

A hint is always-visible support text on a row below the field and above the errors. Hints share that row in equal parts and each aligns its own text, so a note and a counter sit on one line:

```html
<formidable-field-decorator>
  <formidable-input-field
    formidableFieldErrors
    name="firstName"
    [maxLength]="150"
    [ngModel]="value.firstName" />
  <div formidableFieldHint>Your legal first name</div>
  <div
    formidableFieldHint
    align="end">
    {{ value.firstName?.length ?? 0 }} / 150
  </div>
</formidable-field-decorator>
```

`align` takes `start` (the default), `center` or `end`. The row is sized by its content and collapses entirely when nothing is projected. There are no pre-defined hints: the library owns the slot, never what goes in it.

---

## Field State

The decorator mirrors the field's state onto its own host as classes — `is-readonly`, `is-disabled`, `is-focused`, `is-invalid`, `label-resting`, `label-inside`, `has-in-field-toggle`, `has-open-panel`, `has-open-sheet` — so a consumer stylesheet can hang off any of them.

Each state is also a set of colour remaps rather than a set of property declarations, which is why a theme changes the invalid or disabled look by setting colours and not by restating rules. The full variable list is in [`user/theme-reference.md`](theme-reference.md); how the decorator resolves the state is in [`tech/decoration.md`](../tech/decoration.md).

---

## Related

- [`user/fields.md`](fields.md) — options, panels, keyboard, dates and times, masking, focus
- [`user/theming.md`](theming.md) — the default theme, how theming works, and how to find your own
- [`user/components.md`](components.md) — every public component, directive, token and type
- [`user/getting-started.md`](getting-started.md) — install, wiring, the stylesheet, a first form
