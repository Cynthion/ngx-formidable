import { ElementRef, InjectionToken, Signal, TemplateRef } from '@angular/core';
import { ValidationError } from '@angular/forms/signals';
import { NgxMaskConfig } from 'ngx-mask';
import { FormidableReveal } from './validation.model';

/**
 * Provide this from a custom field, as `{ provide: FORMIDABLE_FIELD, useExisting: forwardRef(() => MyField) }`,
 * and `formidable-field-decorator` will decorate it like any built-in field. Without it, nothing happens.
 */
export const FORMIDABLE_FIELD = new InjectionToken<FormidableField>('FORMIDABLE_FIELD');

/** What an option field provides so a projected `FieldOption` can reach the field that owns it. */
export const FORMIDABLE_OPTION_FIELD = new InjectionToken<FormidableOptionField>('FORMIDABLE_OPTION_FIELD');

/** What an option provides so its field's `contentChildren` query finds it, whatever component it is. */
export const FORMIDABLE_OPTION = new InjectionToken<FormidableOptionSource>('FORMIDABLE_OPTION');

/** App-wide ngx-mask defaults, which a field's own `maskConfig` overrides. Set via `provideNgxFormidable`. */
export const FORMIDABLE_MASK_DEFAULTS = new InjectionToken<Partial<NgxMaskConfig>>('FORMIDABLE_MASK_DEFAULTS');

/** The default text an option field shows in place of an empty list, overridable per field. */
export const NO_OPTIONS_TEXT = 'No options available.';

/**
 * The shape a field asks its decorator to render in, which is the field's own choice and not a consumer's.
 * `horizontal` is a label-and-value box and the only layout the inside and border label positions and the
 * absolutely positioned adornments work in; `vertical` stacks a group's options; `inline` is a bare pill.
 */
export type FieldDecoratorLayout = 'horizontal' | 'vertical' | 'inline';

/**
 * Where the field's label renders:
 * - `outside`: statically above the field, in normal document flow.
 * - `inside`: inside the field's bounds, centered like a placeholder while the field is visually empty,
 *   floating above the value otherwise (default). A field with a `placeholder` has nothing to rest in, so
 *   its label floats throughout.
 * - `inside-placeholder`: as `inside`, but the label takes the placeholder's place instead of yielding to
 *   it — the field's own `placeholder` stays hidden until focus floats the label and reveals it.
 * - `inside-floating`: inside the field's bounds, always floating — it never rests.
 * - `border`: centered on the field's top border, which it hides behind itself, aligned with the value.
 * - `border-prefix`: as `border`, but aligned with a projected prefix instead of with the value.
 */
export type FieldLabelPosition =
  'outside' | 'inside' | 'inside-placeholder' | 'inside-floating' | 'border' | 'border-prefix';

/**
 * Where the field's value sits vertically, which a projected prefix/suffix aligns itself with: the
 * `center` of the field's box (the default), or its `top` line for a multi-line field, whose box grows
 * as the value does.
 */
export type FieldValueAlignment = 'center' | 'top';

/**
 * Where a projected hint sits horizontally within the decorator's hint row. Each hint aligns
 * itself, so a `start` note and an `end` counter share one row.
 */
export type FieldHintAlignment = 'start' | 'center' | 'end';

/**
 * What a projected prefix/suffix follows vertically: the `center` of the field's box (the default), or
 * the field's `value`, which an inside label pushes down. A field that top-aligns its value
 * (`valueAlignment: 'top'`) always aligns with it, so this has no effect there.
 */
export type FieldAdornmentAlignment = 'center' | 'value';

/**
 * How an option paints itself: as a plain `inline` panel row, or with a radio or checkbox marker beside its
 * label. Purely a look — the ARIA role comes from the field's `optionRole` instead.
 */
export type FieldOptionLayout = 'inline' | 'radio-group' | 'checkbox-group';

/**
 * The ARIA role an option field's options take. It follows the container, not the option's `layout` —
 * a `listbox` owns `option`s that report `aria-selected`, the two groups own `radio`s and `checkbox`es
 * that report `aria-checked`.
 */
export type FieldOptionRole = 'option' | 'radio' | 'checkbox';

/**
 * When an option field renders its `defaultOption`: `always` as the first entry, never sorted and never
 * filtered, or only as a `fallback` when the option list would otherwise be empty.
 */
export type FieldDefaultOptionMode = 'always' | 'fallback';

/**
 * Where a field's panel opens: aligned to the field's `left` or `right` edge, spanning its `full` width, or
 * as a `sheet` pinned across the bottom of the viewport. The first three flip above the field when there
 * is no room below; a sheet does not move.
 */
export type FormidablePanelPosition = 'left' | 'right' | 'full' | 'sheet';

/** Which side of the toggle's switch its `onLabel` / `offLabel` sits on. */
export type FormidableToggleFieldLabelPosition = 'before' | 'after';

/**
 * What an empty date/time field shows in its mask slots while **unfocused**: underscores
 * (default, e.g. `____-__-__`), or the `unicodeTokenFormat` (e.g. `dd . MM . yyyy`).
 * A focused empty field always shows underscores — ngxMask's caret arithmetic only recognizes its own placeholder.
 */
export type FormidableEmptyHint = 'underscores' | 'format';

/**
 * App-wide defaults for the inputs every template would otherwise repeat. Set via `provideNgxFormidable`, or
 * provide `FORMIDABLE_DEFAULTS` in a component's `providers` to scope them to that subtree. A binding still
 * wins, and binding `undefined` falls back to the default. Each is read once, when its field or form is
 * created, so changing one afterwards reaches only what is created afterwards.
 */
export interface FormidableDefaults {
  /** `FieldLabel.position`. The library's own: `inside`. */
  labelPosition?: FieldLabelPosition;
  /** `FieldPrefix.align`. The library's own: `center`. */
  prefixAlign?: FieldAdornmentAlignment;
  /** `FieldSuffix.align`. The library's own: `center`. */
  suffixAlign?: FieldAdornmentAlignment;
  /** `panelPosition` on the dropdown, autocomplete and date fields, which otherwise each keep their own. */
  panelPosition?: FormidablePanelPosition;
  /** A field's `revealOn`, and the form's. The library's own: `touched`. */
  revealOn?: FormidableReveal;
  /** The form's `hideRequiredMarkers`, and a field's without a form. The library's own: `false`. */
  hideRequiredMarkers?: boolean;
}

/** The app-wide defaults. Empty unless `provideNgxFormidable({ defaults })` or a component provides it. */
export const FORMIDABLE_DEFAULTS = new InjectionToken<FormidableDefaults>('FORMIDABLE_DEFAULTS', {
  providedIn: 'root',
  factory: () => ({})
});

/**
 * What every field exposes to its decorator, and the contract a custom field satisfies. `BaseField`
 * implements all of it; a field is only discovered once it also provides `FORMIDABLE_FIELD`.
 */
export interface FormidableField<T = string | null> {
  /** The field's outer element, which the decorator measures and the global listeners are scoped to. */
  fieldRef: ElementRef<HTMLElement>;
  /** Unique per instance, and the stem every ARIA id around and inside the field is derived from. */
  fieldId: string;
  /** What the field holds — the model, which the forms API binds two-way. */
  value: Signal<T>;
  name: Signal<string>;
  placeholder: Signal<string>;
  readonly: Signal<boolean>;
  disabled: Signal<boolean>;
  /** Suffixes the marker to its label and sets `aria-required`. Validates nothing. */
  required: Signal<boolean>;
  /** Whether the field shows its errors: it is invalid and its reveal has come. Drives `aria-invalid`. */
  showErrors: Signal<boolean>;
  /** The errors the decorator renders as messages: none until `showErrors`, and the last ones while pending. */
  shownErrors: Signal<readonly ValidationError[]>;
  /** Whether focus is inside the field, which the decorator's own focus state follows. */
  isFieldFocused: Signal<boolean>;
  /** Whether nothing is rendered where the value goes, so a label may rest there like a placeholder. */
  canLabelRest: Signal<boolean>;
  /** Whether the field renders a panel toggle inside its own box, which the value and a label must clear. */
  hasInFieldToggle?: Signal<boolean>;
  valueAlignment?: FieldValueAlignment;
  decoratorLayout: FieldDecoratorLayout;
}

/** What a field walking a list of options adds to the contract. Provided as `FORMIDABLE_OPTION_FIELD`. */
export interface FormidableOptionField {
  options: Signal<FormidableOption[] | undefined>;
  /** An option pinned to the top of the list — see `defaultOptionMode` for when it renders. */
  defaultOption: Signal<FormidableOption | undefined>;
  defaultOptionMode: Signal<FieldDefaultOptionMode>;
  /** Called by an option that was activated, so the field commits it and closes any panel. */
  selectOption(option: FormidableOption): void;
  sortFn: Signal<((a: FormidableOption, b: FormidableOption) => number) | undefined>;
  /** The ARIA role its options take. Optional — an option falls back to `option` when its parent says nothing. */
  optionRole?: FieldOptionRole;
}

/**
 * One option as plain data. This is what a consumer writes into an option field's `options` input, and what
 * every field works with internally — an option **component** hands one over as `FormidableOptionSource`.
 */
export interface FormidableOption<T = unknown> {
  /** What reaches the model, and the identity the field compares selection against. */
  value: string;
  /** Display text. Falls back to `value` when absent. */
  label?: string;
  /** Custom content rendered in place of the label. */
  template?: TemplateRef<T>;
  readonly?: boolean;
  disabled?: boolean;
  /** Whether an autocomplete's filter text matches this option. Replaces the default substring test. */
  match?: (filterValue: string) => boolean;
}

/**
 * An entry that runs an action instead of becoming a value. The two panel fields take one as `actionOption`:
 * it renders last, the keyboard walks it like any option, and picking it closes the panel and commits nothing.
 */
export interface FormidableActionOption<T = unknown> extends FormidableOption<T> {
  /** Runs when the entry is picked. */
  action: () => void;
}

/**
 * What a component that **is** an option exposes, so the field that owns it can read one option out of it.
 * Provided as `FORMIDABLE_OPTION`; `FieldOption` implements it, and so does anything extending it.
 */
export interface FormidableOptionSource {
  /** The plain option this component stands for, folded out of its inputs and its projected content. */
  readonly option: Signal<FormidableOption>;
}

/** What a field that opens a panel adds to the contract, and what the panel positioning helpers read. */
export interface FormidablePanelField {
  panelRef: Signal<ElementRef<HTMLElement> | undefined>;
  isPanelOpen: Signal<boolean>;
  togglePanel(isOpen: boolean): void;
  panelPosition: Signal<FormidablePanelPosition>;
}
