# Custom Fields

The library's eleven fields do not cover everything, so `BaseField` is the extension point. A field built on it binds to every forms API, and is decorated, themed and made accessible exactly like a built-in one: nothing in the library knows the difference.

The worked example below is `example-counter-field` in the portal, quoted as it ships.

## What You Get For Free

Extend `BaseField` and provide the component as `FORMIDABLE_FIELD`, and it gains:

| Capability                              | Comes From                                                                     |
| :-------------------------------------- | :----------------------------------------------------------------------------- |
| Binding Under Every Forms API           | `FormValueControl`, which `BaseField` implements around your `value` model     |
| The State Each Forms API Holds          | The inputs `BaseField` declares: `disabled`, `readonly`, `required`, `errors`… |
| Messages And Their Reveal               | `showErrors` and `shownErrors`, which the decorator renders                    |
| Label, Adornment, Prefix, Suffix, Hints | The surrounding `formidable-field-decorator`                                   |
| Required Marker                         | The `required` input, set by whichever forms API binds the field               |
| Focus And `autoFocus`                   | `focus()`, inherited from the base                                             |
| Accessible Names                        | `labelledBy` and `describedBy`, protected getters on the base                  |
| Touch On Blur                           | `onFocusChange(false)`, which emits `touch` as its last act                    |
| Keyboard Listener                       | The base, filtered on focus, readonly and disabled                             |

---

## The Contract

Extend `BaseField<T>`, where `T` is the field's value type, and provide it as `FORMIDABLE_FIELD`, which is what lets the decorator find it. No value accessor: every forms API binds a `FormValueControl` through its `value` model.

```ts
providers: [{ provide: FORMIDABLE_FIELD, useExisting: MyField }];
```

Then supply the abstract members:

| Member                       | Supply                                                                                            |
| :--------------------------- | :------------------------------------------------------------------------------------------------ |
| `value`                      | A `model<T>()`: the forms API writes it, and the field renders from it                            |
| `fieldRef`                   | The field's outer element. The decorator measures it and the listeners are scoped to it           |
| `decoratorLayout`            | `'horizontal'`, `'vertical'` or `'inline'`, see [`user/decoration.md`](decoration.md)             |
| `doOnFocusChange(isFocused)` | The field's half of a focus change. Guard `readonly` here, not in `onFocusChange`                 |
| `registeredKeys`             | The keys that reach `keyboardCallback`. `[]` for none                                             |
| `keyboardCallback`           | Handles those keys and returns whether it acted; only such a key is `preventDefault`ed. Or `null` |

And override these where they apply:

| Member                | Override When                                                                                   |
| :-------------------- | :---------------------------------------------------------------------------------------------- |
| `isSameValue(a, b)`   | The value is a `Date` or an array, which `Object.is` cannot compare                             |
| `showsEmptyValueHint` | The field renders something where the value goes while empty, which a resting label would hit   |
| `focusElement`        | The element that takes focus is not `fieldRef`, as with a wrapper `div` around an inner `input` |
| `valueAlignment`      | The value is top-aligned rather than centred, so a prefix sits on its first line                |
| `hasInFieldToggle`    | The field draws something of its own at its inner right edge, which the value must clear        |

Three rules keep a field honest under every forms API:

- **Only The User Writes The Model**: hand a user's edit to the protected `setValue(next)`, which writes nothing for an edit equal to the model. Never write `value` for any other reason, such as to clamp, to re-mask or to correct what the forms API gave you.
- **Report Focus Through `onFocusChange`**: bind it to the focus and blur of whatever takes focus. Where focus can move between elements of the field's own, bind it to `focusin` and `focusout` on `fieldRef` and pass the event, so such a move is no blur.
- **Edit Nothing While Readonly Or Disabled**: a public method that edits returns early while the field is either. The protected `canEdit` signal is false for both.

---

## A Working Example

A counter: it holds a number rather than a string, steps with the arrow keys, and always renders something where the value goes. Those are the three things a plain text field does not have to deal with.

```ts
import { Component, ElementRef, input, model, signal, viewChild } from '@angular/core';
import { BaseField, FieldDecoratorLayout, FORMIDABLE_FIELD, FormidableField } from '@cynthion/ngx-formidable';

/**
 * A custom field built on `BaseField`: the reference implementation for `user/custom-fields.md`.
 *
 * It holds a number rather than a string, steps with the arrow keys, and always renders something where the
 * value goes, which is the three things a text field does not have to deal with.
 */
@Component({
  selector: 'example-counter-field',
  templateUrl: './example-counter-field.html',
  styleUrls: ['./example-counter-field.scss'],
  providers: [
    // required to provide this component as FormidableField
    {
      provide: FORMIDABLE_FIELD,
      useExisting: ExampleCounterField
    }
  ]
})
export class ExampleCounterField extends BaseField<number> implements FormidableField<number> {
  readonly counterRef = viewChild.required<ElementRef<HTMLDivElement>>('counterRef');

  protected keyboardCallback = (event: KeyboardEvent) => this.handleKeydown(event);
  protected registeredKeys = ['ArrowUp', 'ArrowDown'];

  /** Lowest value the counter steps to. `[formField]` writes it from a `min()` rule. */
  public readonly min = input(0, { transform: (min: number | undefined) => min ?? 0 });

  /** Highest value the counter steps to. `[formField]` writes it from a `max()` rule. */
  public readonly max = input(10, { transform: (max: number | undefined) => max ?? 10 });

  /** How much one step moves the value. */
  public readonly step = input(1);

  /** The count. Every forms API binds it two-way; the counter writes it back only for a step of the user's. */
  public readonly value = model(0);

  protected doOnFocusChange(_isFocused: boolean): void {
    // No additional actions needed
  }

  // The base already filters the key stream on focus, readonly and disabled.
  private handleKeydown(event: KeyboardEvent): boolean {
    switch (event.key) {
      case 'ArrowUp':
        this.increment();
        return true;
      case 'ArrowDown':
        this.decrement();
        return true;
      default:
        return false;
    }
  }

  // #region FormidableField

  get fieldRef(): ElementRef<HTMLElement> {
    return this.counterRef() as ElementRef<HTMLElement>;
  }

  // The counter always renders a number where the value goes, so a resting label would land on top of it.
  protected override readonly showsEmptyValueHint = signal(true);

  decoratorLayout: FieldDecoratorLayout = 'horizontal';

  // #endregion

  /** Steps the value up by `step`, stopping at `max`. No-op while readonly or disabled. */
  public increment(): void {
    this.stepBy(this.step());
  }

  /** Steps the value down by `step`, stopping at `min`. No-op while readonly or disabled. */
  public decrement(): void {
    this.stepBy(-this.step());
  }

  protected onButtonPointerDown(event: PointerEvent): void {
    // Keeps the focus on the field rather than letting it land on the button.
    event.preventDefault();
    this.focus();
  }

  private stepBy(by: number): void {
    if (this.readonly() || this.disabled()) return;

    // `setValue` reports nothing for a step that changes nothing, such as one pressed at `min` or `max`.
    this.setValue(this.clamp(this.value() + by));
  }

  private clamp(value: number): number {
    return Math.max(this.min(), Math.min(this.max(), value));
  }
}
```

- **`min` And `max` Take `undefined`**: `[formField]` writes an input named like a rule's limit from that rule, and `undefined` where the schema states none. The transform falls back to the counter's own.
- **The Clamp Is On The Step**: a step never leaves `min` and `max`, while a value the forms API writes outside them is rendered as it is.

The template carries the focus handlers and the accessibility attributes. `labelledBy` and `describedBy` are protected getters on the base, and resolve to `null` when the field is used without a decorator, so nothing dangles; `showErrors()` is what `aria-invalid` follows.

```html
<div
  #counterRef
  role="spinbutton"
  class="counter"
  [tabindex]="disabled() ? -1 : 0"
  [class.is-readonly]="readonly()"
  [class.is-disabled]="disabled()"
  [attr.aria-valuenow]="value()"
  [attr.aria-valuemin]="min()"
  [attr.aria-valuemax]="max()"
  [attr.aria-labelledby]="labelledBy"
  [attr.aria-describedby]="describedBy"
  [attr.aria-required]="required() || null"
  [attr.aria-invalid]="showErrors() || null"
  [attr.aria-readonly]="readonly() || null"
  [attr.aria-disabled]="disabled() || null"
  (focus)="onFocusChange(true)"
  (blur)="onFocusChange(false)">
  <button
    type="button"
    tabindex="-1"
    class="counter-button"
    aria-hidden="true"
    [disabled]="readonly() || disabled() || value() <= min()"
    (pointerdown)="onButtonPointerDown($event)"
    (click)="decrement()">
    &minus;
  </button>

  <span class="counter-value">{{ value() }}</span>

  <button
    type="button"
    tabindex="-1"
    class="counter-button"
    aria-hidden="true"
    [disabled]="readonly() || disabled() || value() >= max()"
    (pointerdown)="onButtonPointerDown($event)"
    (click)="increment()">
    +
  </button>
</div>
```

### Styling It

A custom field styles itself; the library's SCSS surface is closed. What is open is every `--formidable-*` custom property, so reading them is what keeps a custom field on whatever theme the page is running. An excerpt of the counter's stylesheet:

```scss
.counter {
  height: var(--formidable-field-height, 56px);
  // The decorator publishes these two on the field's host when a prefix or a suffix is projected.
  padding-right: var(--formidable-field-suffix-inset, var(--formidable-field-padding-x, 16px));
  padding-left: var(--formidable-field-prefix-inset, var(--formidable-field-padding-x, 16px));
  // Set by the decorator while a label sits inside the field, so the value clears it. Zero otherwise.
  padding-top: var(--formidable-field-value-padding-top, 0);
  color: var(--formidable-color-field-text, #1e293b);
  background: var(--formidable-color-field-background, #f8fafc);
  border: var(--formidable-field-border-thickness, 1px) solid var(--formidable-color-field-border, #818cf8);
  border-radius: var(--formidable-field-border-radius, var(--formidable-border-radius, 8px));
}
```

The three insets are the ones a custom field is likely to miss. The full list is in [`user/theme-reference.md`](theme-reference.md).

### Using It

Exactly like a built-in field, under any forms API. Under Signal Forms, the schema states its limits:

```ts
// in the schema()
min(path.pets, 0);
max(path.pets, 10);
```

```html
<formidable-field-decorator>
  <example-counter-field [formField]="form.pets" />
  <div formidableFieldLabel>Pets</div>
  <div formidableFieldHint>Arrow keys step it</div>
</formidable-field-decorator>
```

A rule on `pets` reports on it like on any other field: nothing about the rule knows the field is not the library's.

---

## Custom Options

An option is a component too. Extend `FieldOption`, provide it as `FORMIDABLE_OPTION`, and project whatever content the option should render:

```ts
@Component({
  selector: 'example-fuzzy-option',
  templateUrl: './example-fuzzy-option.html',
  providers: [
    // required to provide this component as FormidableOption
    {
      provide: FORMIDABLE_OPTION,
      useExisting: forwardRef(() => ExampleFuzzyOption)
    }
  ]
})
export class ExampleFuzzyOption extends FieldOption {
  readonly subtitle = input<string | undefined>('sub');

  readonly highlightedEntries = input<HighlightedEntries>({
    labelEntries: [],
    subtitleEntries: []
  });
}
```

The projected content goes in an `ng-template`, which is what the parent field renders in the option's place:

```html
<div>
  <ng-template #contentTemplate>
    <p class="option-label">{{ label() }}</p>
    <p class="option-subtitle">{{ subtitle() }}</p>
  </ng-template>
</div>
```

Only the `ng-template` is rendered, in the option's place inside the field. The component's own host element never reaches the DOM, so nothing outside that template is drawn or clickable.

What `FORMIDABLE_OPTION` provides is `FormidableOptionSource`: one `option` computed holding the plain `FormidableOption` the owning field reads off the component. `FieldOption` implements it, so extending it is all that is needed and a subclass's own inputs are for its template. Writing an option component from scratch means providing `option` yourself. Either way what a field receives is plain data: the same shape its `options` input takes.

The option's ARIA role is not its own to choose: it comes from the parent field, so an option inside a listbox is an `option` and one inside a radio group is a `radio`. `layout` is a look, not a role.

A field that hosts options of its own implements `FormidableOptionField` and provides `FORMIDABLE_OPTION_FIELD`; if it walks its list with a highlight, extend `BaseOptionField` instead of `BaseField` and the highlight machinery comes with it. Both are catalogued in [`user/components.md`](components.md).

---

## Related

- [`user/components.md`](components.md): every public component, directive, token and type
- [`user/forms.md`](forms.md): how the fields meet Signal Forms, reactive forms and template-driven forms
- [`user/fields.md`](fields.md): options, panels, keyboard, dates and times, masking, focus
- [`user/theming.md`](theming.md): the default theme, how theming works, and how to find your own
