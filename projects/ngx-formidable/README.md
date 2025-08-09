<h1 align="center">ngx-formidable</h1>

<p align="center">
A comprehensive Angular component library for building rich, validated forms.
</p>

<p align="center">
  Created with ❤️ by Cynthion
</p>

## Features

<table>
  <tr>
    <td width="33%" valign="top">
      <h5><a href="#quick-start">🚀 Zero Boilerplate</a></h5>
      <ul>
        <li><code>&lt;form formidableForm&gt;</code> (single directive)</li>
        <li>Wires model + <code>Frame</code> + Vest</li>
        <li>Streams/outputs: <code>value</code>/<code>valid</code>/<code>dirty</code>/<code>errors</code></li>
      </ul>
    </td>
    <td width="33%" valign="top">
      <h5><a href="#root-level--cross-field-validation">✅ Async Validation</a></h5>
      <ul>
        <li>Per-Field or Cross-Field / Root-Level</li>
				<li>Powered by <code>Vest</code></li>
        <li>Live errors &amp; validity</li>
				<li>Simple <code>formidable-field-errors</code> directive
      </ul>
    </td>
    <td width="33%" valign="top">
      <h5><a href="#field-components">🧩 Rich Field Components</a></h5>
      <ul>
        <li>Input / Textarea</li>
        <li>Select / Dropdown / Autocomplete</li>
				<li>Radio Groups / Checkboxes</li>
        <li>Date Picker / Time</li>
				<li>Re-usable <code>formidable-field-option</code> for all option fields.
      </ul>
    </td>
  </tr>

  <tr>
    <td width="33%" valign="top">
      <h5><a href="#field-decorator">🎀 Field Decorator</a></h5>
      <ul>
        <li>Label / Tooltip / Prefix / Suffix</li>
        <li>Floating label transitions</li>
        <li>Forwards <code>valueChanged</code>/<code>focusChanged</code></li>
      </ul>
    </td>
    <td width="33%" valign="top">
      <h5><a href="#theming--styles">🎨 Theming &amp; Styling</a></h5>
      <ul>
        <li>Overridable <code>CSS</code> variables</li>
				<li>Overridable <code>Pikaday</code> classes</li>
      </ul>
    </td>
    <td width="33%" valign="top">
      <h5><a href="#keyboard-navigation">⌨️ Keyboard Navigation</a></h5>
      <ul>
        <li>Simple navigation (<code>Enter</code>/<code>Esc</code>/<code>Tab</code><code>Arrows</code>, etc.)</li>
        <li>Type-ahead buffers</li>
        <li>Managed focus &amp; scroll into view</li>
      </ul>
    </td>
  </tr>

  <tr>
    <td width="33%" valign="top">
      <h5><a href="#masking">🛡️ Masking</a></h5>
      <ul>
			<li>Powered by <code>ngx-mask</code></li>
        <li>Per-field opt-in via <code>[mask]</code> and <code>[maskConfig]</code></li>
        <li>Global app defaults with <code>FORMIDABLE_MASK_DEFAULTS</code></li>
      </ul>
    </td>
    <td width="33%" valign="top">
      <h5><a href="#quick-start">🧠 Type Safety (Frame)</a></h5>
      <ul>
				<li>Deep-required <code>Frame</code> concept</li>
				<li>Shows model errors at build time</li>
        <li>Strongly-typed templates/suites</li>
      </ul>
    </td>
    <td width="33%" valign="top">
      <h5><a href="#extending-with-custom-components--options">🛠️ Extensible</a></h5>
      <ul>
        <li><code>IFormidableField</code> for custom inputs</li>
        <li>Options: <code>IFormidableOptionField</code> + <code>FORMIDABLE_FIELD_OPTION</code></li>
        <li>Reuse <code>BaseFieldDirective</code></li>
      </ul>
    </td>
  </tr>
</table>

**🌐 Live Demo**

Explore live examples on our GitHub Pages: https://cynthion.github.io/ngx-formidable/

---

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Core Directives](#core-directives)
- [Field Decorator](#field-decorator)
- [Field Components](#field-components)
- [Theming & Styles](#theming--styles)
- [Root-Level / Cross-Field Validation](#root-level--cross-field-validation)
- [Keyboard Navigation](#keyboard-navigation)
- [Masking](#masking)
- [Extending with Custom Components / Options](#extending-with-custom-components--options)
- [Contributing](#contributing)
- [License](#license)

---

## Installation

Install the package and its peer dependencies:

```bash
npm install ngx-formidable vest pikaday date-fns ngx-mask
```

```ts
import { NgxFormidableModule } from 'ngx-formidable';

@NgModule({
	imports: [
		// ...
		NgxFormidableModule
	]
})
export class AppModule {}
```

---

## Quick Start

1. Define your model, form model, frame, and Vest validation suite:

```ts
import { DeepPartial, DeepRequired } from 'ngx-formidable';

export interface User {
	name: string;
	hobby: 'reading' | 'gaming' | 'swimming';
	birthdate: Date;
}

export type UserFormModel = DeepPartial<User>;
export type UserFormFrame = DeepRequired<UserFormModel>;

export const userFormModel: UserFormModel = {
	// set initial values here, if any
	name: undefined, // e.g., 'Cynthion',
	hobby: undefined, // e.g., 'reading',
	birthdate: undefined // e.g., new Date(1989, 5, 29),
};

export const userFormFrame: UserFormFrame = {
	name: '',
	hobby: 'other',
	birthdate: new Date()
};

export const userFormValidationSuite = staticSuite((model: UserFormModel, field?: string) => {
	mode(Modes.ALL); // or use Modes.EAGER to just use first
	if (field) only(field);

	test('name', 'First name is required.', () => {
		enforce(model.name).isNotBlank();
	});

	test('name', 'First name does not start with A.', () => {
		enforce(model.name?.toLowerCase()).startsWith('a');
	});

	// further Vest validators
});
```

2. Setup your form template:

```html
<form
	formidableForm
	[formValue]="userFormModel"
	[formFrame]="userFormFrame"
	[suite]="userFormValidationSuite"
	[validationOptions]="{ debounceValidationInMs: 200 }"
	(formValueChange$)="userFormModel = $event"
	(validChange$)="isValid = $event"
	(dirtyChange$)="isDirty = $event"
	(errorsChange$)="errors = $event"
	(ngSubmit)="onSubmit()">
	<formidable-field-decorator>
		<formidable-input-field
			formidableFieldErrors
			name="name"
			ngModel
			placeholder="Name"></formidable-input-field>
		<div formidableFieldLabel>Name</div>
		<div formidableFieldTooltip>Enter your name</div>
	</formidable-field-decorator>

	<formidable-field-decorator>
		<formidable-select-field
			placeholder="Select..."
			name="hobby"
			[disabled]="false"
			[readonly]="false"
			[ngModel]="vm.formValue.hobby"
			[options]="hobbyOptions">
			<!-- optional inline options -->
			<formidable-field-option [value]="'gardening'">Gardening</formidable-field-option>
		</formidable-select-field>
		<div
			formidableFieldLabel
			[isFloating]="true">
			Hobby
		</div>
	</formidable-field-decorator>

	<formidable-field-decorator>
		<formidable-date-field
			name="birthdate"
			ngModel
			[minDate]="minDate"
			[maxDate]="maxDate"
			[unicodeTokenFormat]="'dd.MM.yyyy'"></formidable-date-field>
		<div formidableFieldLabel>Birthdate</div>
	</formidable-field-decorator>

	<button
		type="submit"
		[disabled]="!isValid">
		Submit
	</button>
</form>
```

---

## Core Directives

### FormDirective (`formidableForm`)

- Binds your form model, frame, and Vest suite.
- Emits `formValueChange$`, `errorsChange$`, `dirtyChange$`, `validChange$`.

### FormRootValidateDirective (`formidableRootValidate`)

Adds a root-level async validator for cross-field Vest tests on `ROOT_FORM`.

### FieldErrorsDirective (`formidableFieldErrors`)

Renders a `<formidable-field-errors>` component next to any control to display its validation messages.

### FormModelDirective

Hooks into each `ngModel` to run per-field async Vest tests.

### FormModelGroupDirective

Hooks into `ngModelGroup` to validate nested groups.

## Field Decorator

Wrap any field in a <formidable-field-decorator> to project:

- Label: `<div formidableFieldLabel [isFloating]="true">…</div>`
- Tooltip: `<div formidableFieldTooltip>…</div>`
- Prefix: `<div formidableFieldPrefix>…</div>`
- Suffix: `<div formidableFieldSuffix>…</div>`

The decorator adjusts padding and forwards the wrapped field’s properties and events.

## Field Components

| Category          | Component                           | Description                                        |
| ----------------- | ----------------------------------- | -------------------------------------------------- |
| **Basic Fields**  | `<formidable-input-field>`          | A standard single-line text input field.           |
|                   | `<formidable-textarea-field>`       | A multi-line textarea with optional autosizing.    |
| **Option Fields** | `<formidable-select-field>`         | A styled dropdown based on the native `<select>`.  |
|                   | `<formidable-dropdown-field>`       | A custom dropdown overlay with keyboard support.   |
|                   | `<formidable-autocomplete-field>`   | A text input that filters and suggests options.    |
|                   | `<formidable-field-option>`         | Defines an individual option for any option field. |
| **Group Fields**  | `<formidable-radio-group-field>`    | A keyboard-navigable group of radio options.       |
|                   | `<formidable-checkbox-group-field>` | A keyboard-navigable group of checkboxes.          |
| **Date & Time**   | `<formidable-date-field>`           | A masked date input with a calendar popup.         |
|                   | `<formidable-time-field>`           | A masked time-only input field.                    |

---

## Theming & Styles

Various styling variables allow to customize the theming. Override any supported CSS variable.
You can also tweak Pikaday CSS.

```scss
// styles.scss

@use 'ngx-formidable';

// ngx-formidable overrides
:root {
	--formidable-field-height: 50px;
	--formidable-color-validation-error: pink;
	--formidable-color-field-background: #d18fe9ff;
	--formidable-color-field-highlighted: #aa40ed2d;
	--formidable-date-field-panel-width: 200px;
	// add more
}

// Pikaday style overwrites
.pika-lendar {
	background-color: #8a2b75ff;
	// add more
}
```

### Overridable CSS Variables

| CSS Variable                                                | Description                                                                    |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------ |
| **Font Sizes & Line-Heights**                               |                                                                                |
| `--formidable-field-font-size`                              | Base font size for form field text.                                            |
| `--formidable-field-font-weight`                            | Font weight for form field text.                                               |
| `--formidable-field-line-height`                            | Line height for form field text.                                               |
| `--formidable-label-font-size`                              | Font size for static labels.                                                   |
| `--formidable-label-font-weight`                            | Font weight for static labels.                                                 |
| `--formidable-label-line-height`                            | Line height for static labels.                                                 |
| `--formidable-label-floating-font-size`                     | Font size for floating labels.                                                 |
| `--formidable-label-floating-font-weight`                   | Font weight for floating labels.                                               |
| `--formidable-label-floating-line-height`                   | Line height for floating labels.                                               |
| `--formidable-field-validation-error-font-size`             | Font size for validation error messages.                                       |
| `--formidable-field-validation-error-font-weight`           | Font weight for validation error messages.                                     |
| `--formidable-field-validation-error-line-height`           | Line height for validation error messages.                                     |
| `--formidable-length-indicator-font-size`                   | Font size for the textarea length indicator.                                   |
| `--formidable-length-indicator-font-weight`                 | Font weight for the textarea length indicator.                                 |
| `--formidable-length-indicator-line-height`                 | Line height for the textarea length indicator.                                 |
| **Colors**                                                  |                                                                                |
| `--formidable-color-validation-error`                       | Color of validation error text.                                                |
| `--formidable-color-field-text`                             | Default text color inside fields.                                              |
| `--formidable-color-field-group-text`                       | Text color for grouped field containers.                                       |
| `--formidable-color-field-text-readonly`                    | Text color when a field is readonly.                                           |
| `--formidable-color-field-text-disabled`                    | Text color when a field is disabled.                                           |
| `--formidable-color-field-label`                            | Color of static labels.                                                        |
| `--formidable-color-field-label-floating`                   | Color of floating labels.                                                      |
| `--formidable-color-field-tooltip`                          | Color of tooltip text.                                                         |
| `--formidable-color-field-placeholder`                      | Color of placeholder text.                                                     |
| `--formidable-color-field-selection`                        | Background color for text selection.                                           |
| `--formidable-color-field-border`                           | Border color for fields.                                                       |
| `--formidable-color-field-border-focus`                     | Border color when a field is focused.                                          |
| `--formidable-color-field-group-border`                     | Border color for grouped fields.                                               |
| `--formidable-color-field-group-border-focus`               | Border color when a group field is focused.                                    |
| `--formidable-color-field-background`                       | Background color for fields.                                                   |
| `--formidable-color-field-group-background`                 | Background color for grouped fields.                                           |
| `--formidable-color-field-background-readonly`              | Background color when a field is readonly.                                     |
| `--formidable-color-field-background-disabled`              | Background color when a field is disabled.                                     |
| `--formidable-color-field-disabled`                         | Overlay color for disabled option elements.                                    |
| `--formidable-color-field-selected`                         | Background color for selected option items.                                    |
| `--formidable-color-field-highlighted`                      | Background color for highlighted (hovered or keyboard-focused) option items.   |
| `--formidable-color-field-hover`                            | Background color when hovering over option items.                              |
| **Date-Field Panel**                                        |                                                                                |
| `--formidable-color-date-field-panel-select`                | Text color for “Today” / selected date toggle in calendar.                     |
| `--formidable-color-date-field-panel-select-hover`          | Hover color for the “Today” toggle.                                            |
| `--formidable-color-date-field-panel-date-highlighted-text` | Text color for highlighted dates inside the calendar.                          |
| `--formidable-color-date-field-panel-date-highlighted`      | Background color for highlighted dates.                                        |
| `--formidable-color-date-field-panel-date-hovered`          | Background color when hovering a date.                                         |
| `--formidable-color-date-field-panel-date-out-of-range`     | Color for dates outside the min/max range.                                     |
| `--formidable-color-date-field-panel-day-label`             | Color for weekday labels in the calendar header.                               |
| **Option Prefix**                                           |                                                                                |
| `--formidable-color-option-prefix-outer`                    | Border color for the outer wrapper of custom option prefixes (checkbox/radio). |
| `--formidable-color-option-prefix-inner`                    | Border color for the inner element of custom option prefixes.                  |
| `--formidable-color-option-prefix-background`               | Background color behind option prefix elements.                                |
| **Length Indicator**                                        |                                                                                |
| `--formidable-color-length-indicator`                       | Text color for the textarea length indicator.                                  |
| **Field Dimensions**                                        |                                                                                |
| `--formidable-field-before-margin-bottom`                   | Vertical margin below each field container.                                    |
| `--formidable-field-border-thickness`                       | Thickness of field borders.                                                    |
| `--formidable-field-border-radius`                          | Border-radius for field corners.                                               |
| `--formidable-label-height`                                 | Computed height of the label text line box.                                    |
| `--formidable-field-height`                                 | Default height for single-line fields.                                         |
| `--formidable-label-floating-offset`                        | Vertical offset applied when a label floats above its field.                   |
| **Textarea**                                                |                                                                                |
| `--formidable-textarea-min-height`                          | Minimum height for textareas.                                                  |
| `--formidable-textarea-max-height`                          | Maximum height for textareas.                                                  |
| `--formidable-textarea-padding-top`                         | Top padding for textareas when autosizing is enabled.                          |
| **Panels**                                                  |                                                                                |
| `--formidable-panel-background`                             | Background color for dropdown/autocomplete/date panels.                        |
| `--formidable-panel-box-shadow`                             | Box-shadow for all panels.                                                     |
| `--formidable-panel-max-height`                             | Maximum vertical height for panels (before scrolling).                         |
| **Animations**                                              |                                                                                |
| `--formidable-animation-duration`                           | Duration for label/flyout/open/close animations.                               |
| `--formidable-animation-easing`                             | Easing curve for animations.                                                   |
| `--formidable-hover-duration`                               | Transition duration for hover effects.                                         |
| `--formidable-hover-easing`                                 | Easing curve for hover transitions.                                            |
| **Z-Index**                                                 |                                                                                |
| `--formidable-flyout-z-index`                               | z-index applied to dropdown/flyout panels.                                     |
| `--formidable-overlay-z-index`                              | z-index applied to any full-screen overlays.                                   |
| `--formidable-above-overlay-z-index`                        | z-index for elements that must sit above overlays.                             |
| **Date-Field Panel Layout**                                 |                                                                                |
| `--formidable-date-field-panel-width`                       | Fixed width for the date-picker panel.                                         |
| `--formidable-date-field-panel-border-radius`               | Border-radius for the date-picker panel.                                       |
| `--formidable-date-field-panel-box-shadow`                  | Box-shadow override for the date-picker panel.                                 |
| **Option Prefix Dimensions**                                |                                                                                |
| `--formidable-option-prefix-dimension-outer`                | Size of the outer circle/box for radio/checkbox prefixes.                      |
| `--formidable-option-prefix-dimension-inner`                | Size of the inner indicator for selected radio/checkbox prefixes.              |

## Root-Level / Cross-Field Validation

Sometimes your form needs rules that depend on more than one field — for example, you might require that **both** `name` and `birthdate` be provided together. You can implement that with a `ROOT_FORM`–level test in your Vest suite. Here is how to do that:

1. Add the `formidableRootValidate` directive to your `<form>`.
2. Include a `ROOT_FORM` test in your Vest suite.

```html
<form
	formidableForm
	formidableRootValidate
	[formValue]="userFormModel"
	[formFrame]="userFormFrame"
	[suite]="userFormValidationSuite"
	...>
	<!-- ... -->
</form>
```

```ts
import { staticSuite, test, Modes, only, enforce } from 'vest';
import { ROOT_FORM } from 'ngx-formidable';

export const userFormValidationSuite = staticSuite((model: UserFormModel, field?: string) => {
	mode(Modes.ALL);
	if (field) only(field);

	// Root-Level / Cross‐field rule: name AND birthdate must both be filled
	test(ROOT_FORM, 'Please enter both name and birthdate.', () => {
		enforce(!!model.name && !!model.birthdate).isTruthy();
	});

	// ...
});
```

## Keyboard Navigation

All controls are keyboard-friendly.

- Disabled/readonly fields ignore navigation.
- `Panel` = Dropdown/Autocomplete/Date overlay.
- Panels close on `Esc` or when focus leaves the field.

| Key             | Inputs / Textareas | Select / Dropdown / Autocomplete                       | Radio / Checkbox Groups | Date Picker                      | Time Field          |
| --------------- | ------------------ | ------------------------------------------------------ | ----------------------- | -------------------------------- | ------------------- |
| `Tab`           | Move to next       | Close panel (if open), then move                       | Move to next            | Close panel (if open), then move | Move to next        |
| `Shift` + `Tab` | Move to previous   | Close panel (if open), then move                       | Move to previous        | Close panel (if open), then move | Move to previous    |
| `Enter`         | —                  | If panel open: choose highlighted option; if closed: — | —                       | Parse & accept date              | Parse & accept time |
| `Esc`           | —                  | Close panel                                            | —                       | Close panel                      | —                   |
| `Arrow Down`    | —                  | If closed: open panel; if open: next option (wrap)     | Next option             | Next day/week                    | —                   |
| `Arrow Up`      | —                  | If open: previous option (wrap)                        | Previous option         | Previous day/week                | —                   |
| `Arrow Left`    | —                  | —                                                      | —                       | Previous day/month               | —                   |
| `Arrow Right`   | —                  | —                                                      | —                       | Next day/month                   | —                   |

### Type-ahead (Dropdowns & Autocomplete)

Typing builds a short type-ahead buffer; the first matching option is highlighted.

- Backspace edits the buffer.
- If the panel is closed, typing the first character opens it.
- The buffer auto-clears after a brief pause.

## Masking

Some fields support input masking. Under the hood this uses ngx-mask, and you can pass (almost) all of its options straight through.

How config is applied:

- Per-field overrides (via `[maskConfig]`) win over…
- App-wide defaults (provided with `FORMIDABLE_MASK_DEFAULTS`), which win over…
- Library fallbacks (sane defaults so nothing explodes).

### App-wide defaults

Provide global defaults once in your app (or a shared) module:

```ts
import { NgModule } from '@angular/core';
import { FORMIDABLE_MASK_DEFAULTS } from 'ngx-formidable';
import { NgxMaskConfig } from 'ngx-mask';

const APP_MASK_DEFAULTS: Partial<NgxMaskConfig> = {
	showMaskTyped: true,
	dropSpecialCharacters: false,
	thousandSeparator: '.',
	decimalMarker: ',',
	prefix: '',
	suffix: ''
};

@NgModule({
	providers: [{ provide: FORMIDABLE_MASK_DEFAULTS, useValue: APP_MASK_DEFAULTS }]
})
export class AppModule {}
```

### Per-field override

```html
<formidable-input-field
	name="price"
	[mask]="'separator.2'"
	[maskConfig]="{ prefix: 'CHF ', allowNegativeNumbers: false, clearIfNotMatch: false }"
	ngModel>
</formidable-input-field>
```

That’s it: set a `[mask]` when you want masking, tweak behavior with `[maskConfig]`, and use the token for project-wide defaults.

## Extending with Custom Components / Options

When you add your own field component (by implementing `IFormidableField` or `IFormidableOptionField` and providing it via `FORMIDABLE_FIELD`/`FORMIDABLE_OPTION_FIELD`), it immediately gains:

- **Async validation** via `FormModelDirective`
- **Root-level / cross-field validation** if you use `formidableRootValidate`
- **Error rendering** simply by adding `formidableFieldErrors`
- **Decorator support** — labels, tooltips, prefixes, and suffixes work out of the box

You don’t need any extra wiring; just implement the interface, extend `BaseFieldDirective`, and register the provider.

---

### Example Component: A Custom Color Picker

```ts
import { ChangeDetectionStrategy, Component, ElementRef, forwardRef, ViewChild } from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { BaseFieldDirective, FieldDecoratorLayout, FORMIDABLE_FIELD, IFormidableField } from 'ngx-formidable';

@Component({
	selector: 'custom-color-picker',
	template: `
		<input
			#inputRef
			type="color"
			[value]="value || '#000000'"
			(input)="onNativeInput($event)" />
	`,
	providers: [
		{
			provide: NG_VALUE_ACCESSOR,
			useExisting: forwardRef(() => CustomColorPickerComponent),
			multi: true
		},
		{
			provide: FORMIDABLE_FIELD,
			useExisting: forwardRef(() => CustomColorPickerComponent)
		}
	],
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class CustomColorPickerComponent extends BaseFieldDirective implements IFormidableField {
	@ViewChild('inputRef', { static: true }) inputRef!: ElementRef<HTMLInputElement>;

	protected keyboardCallback = null;
	protected externalClickCallback = null;
	protected windowResizeScrollCallback = null;
	protected registeredKeys: string[] = [];

	protected doOnValueChange(): void {
		// No additional actions needed
	}

	protected doOnFocusChange(_isFocused: boolean): void {
		// No additional actions needed
	}

	//#region ControlValueAccessor

	// Called when Angular writes to the form control
	protected doWriteValue(value: string): void {
		this.inputRef.nativeElement.value = value || '#000000';
	}

	//#endregion

	//#region IFormidableField

	get value(): string | null {
		return this.inputRef.nativeElement.value || null;
	}

	get isLabelFloating(): boolean {
		return !this.isFieldFocused && !this.isFieldFilled;
	}

	get fieldRef(): ElementRef<HTMLElement> {
		return this.inputRef as ElementRef<HTMLElement>;
	}

	decoratorLayout: FieldDecoratorLayout = 'single';

	//#endregion

	//#region Custom Input Properties

	// ...

	//#endregion

	// Called when the native input fires
	onNativeInput(event: Event): void {
		const v = (event.target as HTMLInputElement).value;
		this.valueChangeSubject$.next(v);
		this.valueChanged.emit(v);
		this.onChange(v);
	}
}
```

### Example Option: A Fuzzy Option

```ts
import { ChangeDetectionStrategy, Component, forwardRef, Input } from '@angular/core';
import { FieldOptionComponent, FORMIDABLE_FIELD_OPTION } from 'ngx-formidable';

export interface HighlightEntry {
	text: string;
	isHighlighted: boolean;
}

export interface HighlightedEntries {
	labelEntries: HighlightEntry[];
	subtitleEntries: HighlightEntry[];
}

@Component({
	selector: 'fuzzy-field-option',
	templateUrl: './fuzzy-option.component.html',
	styleUrls: ['./fuzzy-option.component.scss'],
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [
		{
			// required to provide this component as IFormidableFieldOption
			provide: FORMIDABLE_FIELD_OPTION,
			useExisting: forwardRef(() => FuzzyFieldOptionComponent)
		}
	]
})
export class FuzzyFieldOptionComponent extends FieldOptionComponent {
	@Input() subtitle?: string = 'sub';

	@Input() highlightedEntries?: HighlightedEntries = {
		labelEntries: [],
		subtitleEntries: []
	};
}
```

```html
<div (click)="select ? select() : null">
	<ng-template #contentTemplate>
		<!-- Custom Template -->
		<p class="option-label">
			@if (highlightedEntries?.labelEntries?.length) { @for (entry of highlightedEntries?.labelEntries; track entry.text) {
			<span [class.option-highlight]="entry.isHighlighted">{{ entry.text }}</span>
			} } @else { {{ label }} }
		</p>
		<p class="option-subtitle">
			@if (highlightedEntries?.subtitleEntries?.length) { @for (entry of highlightedEntries?.subtitleEntries; track entry.text) {
			<span [class.option-highlight]="entry.isHighlighted">{{ entry.text }}</span>
			} } @else { {{ subtitle }} }
		</p>
	</ng-template>
</div>
```

```scss
:host {
	display: block;
}

.option-label {
	font-weight: normal;
	font-size: 16px;
}

.option-subtitle {
	font-weight: bold;
	font-size: 12px;
}

.option-highlight {
	color: orange;
}
```

---

## Contributing

Contributions are welcome!

1. **Fork** the repo and create a feature branch.
2. **Run** `npm install` and `npm run build` to compile.
3. **Add tests** under `src/**/*.spec.ts` and update existing ones as needed.
4. **Document** any new public APIs or styles in the `README.md` and link to the live docs.
5. Open a **Pull Request** describing your changes.

---

## License

Everything in this repository is licensed under the [MIT License](./LICENSE) unless otherwise specified.

Copyright (c) 2025 - present Christian Lüthold
