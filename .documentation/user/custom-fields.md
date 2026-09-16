# Custom Fields

The library's eleven fields do not cover everything, so `BaseFieldDirective` is the extension point. A field built on it is decorated, validated, themed and made accessible exactly like a built-in one — nothing in the library knows the difference.

The worked example below is `example-counter-field` in the demo app, quoted as it ships.

## What You Get For Free

Register the component as `FORMIDABLE_FIELD` and it immediately gains:

| Capability                                   | Comes from                                                                 |
| :------------------------------------------- | :------------------------------------------------------------------------- |
| Field rules                                  | `NgxFormidableFieldValidateDirective`, which attaches to every `ngModel`   |
| Group and whole-form rules                   | Being inside the form the rules report on                                  |
| Error messages                               | Adding `formidableFieldErrors`, with or without a decorator                |
| Label and adornment                          | The surrounding `formidable-field-decorator`                               |
| Prefix, suffix, hints                        | The same decorator                                                         |
| Required marker                              | `showRequiredMarker`, inherited from the base                              |
| Focus and `autoFocus`                        | `focus()`, inherited from the base                                         |
| Accessible names                             | `labelledBy`, `describedBy` and `isInvalid`, protected getters on the base |
| Keyboard, outside-click and resize listeners | The base, registered outside the Angular zone                              |

---

## The Contract

Extend `BaseFieldDirective<T>` — `T` is the field's value type — and register two providers. Extending alone is not enough: `NG_VALUE_ACCESSOR` is what lets `ngModel` bind the field, and `FORMIDABLE_FIELD` is what lets the decorator find it.

```ts
providers: [
	{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => MyFieldComponent), multi: true },
	{ provide: FORMIDABLE_FIELD, useExisting: MyFieldComponent }
];
```

Then supply the abstract members:

| Member                       | Supply                                                                                  |
| :--------------------------- | :-------------------------------------------------------------------------------------- |
| `value`                      | A getter reading the current value off whatever the field renders                       |
| `fieldRef`                   | The field's outer element. The decorator measures it and the listeners are scoped to it |
| `decoratorLayout`            | `'horizontal'`, `'vertical'` or `'inline'` — see `user/decoration.md`                   |
| `doWriteValue(value)`        | Put a value the form wrote into whatever the field renders                              |
| `doOnValueChange()`          | The field's half of a value change, after the base has committed it                     |
| `doOnFocusChange(isFocused)` | The field's half of a focus change. Guard `readonly` here, not in `onFocusChange`       |
| `registeredKeys`             | The keys that reach `keyboardCallback`. `[]` for none                                   |
| `keyboardCallback`           | Handles those keys, or `null`                                                           |
| `externalClickCallback`      | Runs on a click outside the field — how a panel closes. `null` to not listen            |
| `windowResizeScrollCallback` | Runs on a debounced resize or scroll — how a panel repositions. `null` to not listen    |

And override these where they apply:

| Member                | Override when                                                                                 |
| :-------------------- | :-------------------------------------------------------------------------------------------- |
| `showsEmptyValueHint` | The field renders something where the value goes while empty, which a resting label would hit |
| `focusElement`        | The element that takes focus is not `fieldRef` — a wrapper `div` around an inner `input`      |
| `valueAlignment`      | The value is top-aligned rather than centred, so a prefix sits on its first line              |
| `hasInFieldToggle`    | The field draws something of its own at its inner right edge, which the value must clear      |
| `ignoresBlur()`       | The field moves focus to something it owns, so that blur is not the user leaving              |

Call the protected `onValueChange()` whenever the user changes the value: it emits both outputs and reports the value to the bound control. Call `onFocusChange(true | false)` on focus and blur.

---

## A Working Example

A counter: it holds a number rather than a string, steps with the arrow keys, and always renders something where the value goes. Those are the three things a plain text field does not have to deal with.

```ts
import { ChangeDetectionStrategy, Component, ElementRef, forwardRef, input, signal, viewChild } from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { BaseFieldDirective, FieldDecoratorLayout, FORMIDABLE_FIELD, IFormidableField } from '@cynthion/ngx-formidable';

@Component({
	selector: 'example-counter-field',
	templateUrl: './example-counter-field.component.html',
	styleUrls: ['./example-counter-field.component.scss'],
	changeDetection: ChangeDetectionStrategy.OnPush,
	standalone: true,
	providers: [
		// required for ControlValueAccessor to work with Angular forms
		{
			provide: NG_VALUE_ACCESSOR,
			useExisting: forwardRef(() => ExampleCounterFieldComponent),
			multi: true
		},
		// required to provide this component as IFormidableField
		{
			provide: FORMIDABLE_FIELD,
			useExisting: ExampleCounterFieldComponent
		}
	]
})
export class ExampleCounterFieldComponent extends BaseFieldDirective<number> implements IFormidableField<number> {
	readonly counterRef = viewChild.required<ElementRef<HTMLDivElement>>('counterRef');

	protected keyboardCallback = (event: KeyboardEvent) => this.handleKeydown(event);
	protected externalClickCallback = null;
	protected windowResizeScrollCallback = null;
	protected registeredKeys = ['ArrowUp', 'ArrowDown'];

	public readonly min = input(0);
	public readonly max = input(10);
	public readonly step = input(1);

	private readonly _value = signal(0);

	protected doOnValueChange(): void {
		// No additional actions needed
	}

	protected doOnFocusChange(_isFocused: boolean): void {
		// No additional actions needed
	}

	// The base already filters the key stream on focus, readonly and disabled.
	private handleKeydown(event: KeyboardEvent): void {
		switch (event.key) {
			case 'ArrowUp':
				this.increment();
				break;
			case 'ArrowDown':
				this.decrement();
				break;
		}
	}

	// #region ControlValueAccessor

	protected doWriteValue(value: number): void {
		this._value.set(this.clamp(typeof value === 'number' && !Number.isNaN(value) ? value : this.min()));
	}

	// #endregion

	// #region IFormidableField

	get value(): number {
		return this._value();
	}

	get fieldRef(): ElementRef<HTMLElement> {
		return this.counterRef() as ElementRef<HTMLElement>;
	}

	// The counter always renders a number where the value goes, so a resting label would land on top of it.
	protected override readonly showsEmptyValueHint = signal(true);

	decoratorLayout: FieldDecoratorLayout = 'horizontal';

	// #endregion

	public increment(): void {
		this.setValue(this._value() + this.step());
	}

	public decrement(): void {
		this.setValue(this._value() - this.step());
	}

	protected onButtonPointerDown(event: PointerEvent): void {
		// Keeps the focus on the field rather than letting it land on the button.
		event.preventDefault();
		this.focus();
	}

	private setValue(next: number): void {
		if (this.readonly() || this.disabled()) return;

		this._value.set(this.clamp(next));
		this.onValueChange(); // emits, and reports the value to the bound control
	}

	private clamp(value: number): number {
		return Math.max(this.min(), Math.min(this.max(), value));
	}
}
```

The template carries the focus handlers and the accessibility attributes. `labelledBy`, `describedBy` and `isInvalid` are protected getters on the base — they resolve to `null` and `false` when the field is used without a decorator, so nothing dangles.

```html
<div
	#counterRef
	role="spinbutton"
	class="counter"
	[tabindex]="disabled ? -1 : 0"
	[class.is-readonly]="readonly"
	[class.is-disabled]="disabled"
	[attr.aria-valuenow]="value"
	[attr.aria-valuemin]="min"
	[attr.aria-valuemax]="max"
	[attr.aria-labelledby]="labelledBy"
	[attr.aria-describedby]="describedBy"
	[attr.aria-required]="showRequiredMarker || null"
	[attr.aria-invalid]="isInvalid || null"
	[attr.aria-readonly]="readonly || null"
	[attr.aria-disabled]="disabled || null"
	(focus)="onFocusChange(true)"
	(blur)="onFocusChange(false)">
	<button
		type="button"
		tabindex="-1"
		aria-hidden="true"
		class="counter-button"
		[disabled]="readonly || disabled || value <= min"
		(pointerdown)="onButtonPointerDown($event)"
		(click)="decrement()">
		&minus;
	</button>

	<span class="counter-value">{{ value }}</span>

	<button
		type="button"
		tabindex="-1"
		aria-hidden="true"
		class="counter-button"
		[disabled]="readonly || disabled || value >= max"
		(pointerdown)="onButtonPointerDown($event)"
		(click)="increment()">
		+
	</button>
</div>
```

### Styling It

A custom field styles itself; the library's SCSS surface is closed. What is open is every `--formidable-*` custom property, so reading them is what keeps a custom field on whatever theme the page is running:

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
	border: var(--formidable-field-border-thickness, 1px) solid var(--formidable-color-field-border, #94a3b8);
	border-radius: var(--formidable-field-border-radius, var(--formidable-border-radius, 8px));
}
```

Those four are the ones a custom field is likely to miss. The full list is in `user/theme-reference.md`.

### Using It

Exactly like a built-in field:

```html
<formidable-field-decorator>
	<example-counter-field
		formidableFieldErrors
		name="pets"
		[min]="0"
		[max]="10"
		[showRequiredMarker]="true"
		[ngModel]="model.pets" />
	<div formidableFieldLabel>Pets</div>
	<div formidableFieldHint>Arrow keys step it</div>
</formidable-field-decorator>
```

A rule naming `pets` reports on it like any other target — nothing about the rule knows the field is not the library's.

---

## Custom Options

An option is a component too. Extend `FieldOptionComponent`, register `FORMIDABLE_OPTION`, and project whatever content the option should render:

```ts
@Component({
	selector: 'example-fuzzy-option',
	templateUrl: './example-fuzzy-option.component.html',
	changeDetection: ChangeDetectionStrategy.OnPush,
	standalone: true,
	providers: [
		// required to provide this component as IFormidableOption
		{
			provide: FORMIDABLE_OPTION,
			useExisting: forwardRef(() => ExampleFuzzyOptionComponent)
		}
	]
})
export class ExampleFuzzyOptionComponent extends FieldOptionComponent {
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

Only the `ng-template` is rendered, in the option's place inside the field — the component's own host element never reaches the DOM, so nothing outside that template is drawn or clickable.

What `FORMIDABLE_OPTION` provides is `IFormidableOptionSource`: one `option` computed holding the plain `IFormidableOption` the owning field reads off the component. `FieldOptionComponent` implements it, so extending it is all that is needed and a subclass's own inputs are for its template. Writing an option component from scratch means providing `option` yourself. Either way what a field receives is plain data — the same shape its `options` input takes.

The option's ARIA role is not its own to choose — it comes from the parent field, so an option inside a listbox is an `option` and one inside a radio group is a `radio`. `layout` is a look, not a role.

A field that hosts options of its own implements `IFormidableOptionField` and provides `FORMIDABLE_OPTION_FIELD`; if it walks its list with a highlight, extend `BaseOptionFieldDirective` instead of `BaseFieldDirective` and the highlight machinery comes with it. Both are catalogued in `user/components.md`.

---

## Custom Validators

A validator is the same kind of extension point and has its own guide: see `user/validation.md`.
