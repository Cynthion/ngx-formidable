import { ElementRef, InjectionToken, OutputEmitterRef, Signal, TemplateRef } from '@angular/core';
import { NgxMaskConfig } from 'ngx-mask';
import { PikadayOptions } from 'pikaday';
import { Observable } from 'rxjs';
import { SignalsOf } from './utility-types';

/**
 * Provide this from a custom field, as `{ provide: FORMIDABLE_FIELD, useExisting: forwardRef(() => MyField) }`,
 * and `formidable-field-decorator` will decorate it like any built-in field. Without it, nothing happens.
 */
export const FORMIDABLE_FIELD = new InjectionToken<IFormidableField>('FORMIDABLE_FIELD');

/** What an option field provides so a projected `FieldOptionComponent` can reach the field that owns it. */
export const FORMIDABLE_OPTION_FIELD = new InjectionToken<IFormidableOptionField>('FORMIDABLE_OPTION_FIELD');

/** What an option provides so its field's `contentChildren` query finds it, whatever component it is. */
export const FORMIDABLE_OPTION = new InjectionToken<IFormidableOptionSource>('FORMIDABLE_OPTION');

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
 * What every field exposes to its decorator, and the contract a custom field satisfies. `BaseFieldDirective`
 * implements all of it; a field is only discovered once it also provides `FORMIDABLE_FIELD`.
 */
export interface IFormidableField<T = string | null> {
  /** The field's outer element, which the decorator measures and the global listeners are scoped to. */
  fieldRef: ElementRef<HTMLElement>;
  /** Unique per instance, and the stem every ARIA id around and inside the field is derived from. */
  fieldId: string;
  name: Signal<string>;
  placeholder: Signal<string>;
  readonly: Signal<boolean>;
  disabled: Signal<boolean>;
  /**
   * Marks the field's label with the required marker. Presentational only.
   */
  showRequiredMarker: Signal<boolean>;
  value: T;
  /** Whether nothing is rendered where the value goes, so a label may rest there like a placeholder. */
  canLabelRest: Signal<boolean>;
  /** Whether the field renders a panel toggle inside its own box, which the value and a label must clear. */
  hasInFieldToggle?: Signal<boolean>;
  valueAlignment?: FieldValueAlignment;
  /** For the decorator, which subscribes on the way in. `valueChanged` is the same signal for a consumer. */
  valueChange$: Observable<T>;
  focusChange$: Observable<boolean>;
  valueChanged: OutputEmitterRef<T>;
  focusChanged: OutputEmitterRef<boolean>;
  decoratorLayout: FieldDecoratorLayout;
}

/** What a field walking a list of options adds to the contract. Provided as `FORMIDABLE_OPTION_FIELD`. */
export interface IFormidableOptionField {
  options: Signal<IFormidableOption[] | undefined>;
  /** An option pinned to the top of the list — see `defaultOptionMode` for when it renders. */
  defaultOption: Signal<IFormidableOption | undefined>;
  defaultOptionMode: Signal<FieldDefaultOptionMode>;
  /** Called by an option that was activated, so the field commits it and closes any panel. */
  selectOption(option: IFormidableOption): void;
  sortFn: Signal<((a: IFormidableOption, b: IFormidableOption) => number) | undefined>;
  /** The ARIA role its options take. Optional — an option falls back to `option` when its parent says nothing. */
  optionRole?: FieldOptionRole;
}

/**
 * One option as plain data. This is what a consumer writes into an option field's `options` input, and what
 * every field works with internally — an option **component** hands one over as `IFormidableOptionSource`.
 */
export interface IFormidableOption<T = unknown> {
  /** What reaches the model, and the identity the field compares selection against. */
  value: string;
  /** Display text. Falls back to `value` when absent. */
  label?: string;
  /** Custom content rendered in place of the label. */
  template?: TemplateRef<T>;
  readonly?: boolean;
  disabled?: boolean;
  /** Runs instead of the field's own selection handling, for an option that does something else. */
  select?: () => void;
  /** Whether an autocomplete's filter text matches this option. Replaces the default substring test. */
  match?: (filterValue: string) => boolean;
}

/**
 * What a component that **is** an option exposes, so the field that owns it can read one option out of it.
 * Provided as `FORMIDABLE_OPTION`; `FieldOptionComponent` implements it, and so does anything extending it.
 */
export interface IFormidableOptionSource {
  /** The plain option this component stands for, folded out of its inputs and its projected content. */
  readonly option: Signal<IFormidableOption>;
}

/** What a field that opens a panel adds to the contract, and what the panel positioning helpers read. */
export interface IFormidablePanelField {
  panelRef: Signal<ElementRef<HTMLElement> | undefined>;
  isPanelOpen: Signal<boolean>;
  togglePanel(isOpen: boolean): void;
  panelPosition: Signal<FormidablePanelPosition>;
}

/** What a field that masks its text input adds to the contract. */
export interface IFormidableMaskField {
  /** Must be a valid ngx-mask (see https://github.com/JsDaddy/ngx-mask). */
  mask: Signal<string | undefined>;
  /** Per-field overrides for ngx-mask. */
  maskConfig: Signal<Partial<NgxMaskConfig> | undefined>;
}

type FormidableInputFieldsKeys = 'name' | 'placeholder' | 'autocomplete' | 'minLength' | 'maxLength';

type FormidableTextareaFieldsKeys = FormidableInputFieldsKeys;

type FormidableSelectFieldsKeys = 'name' | 'disabled';

/** The subset of `<input/>` properties that are supported. */
export interface IFormidableInputField
  extends SignalsOf<Pick<HTMLInputElement, FormidableInputFieldsKeys>>, IFormidableField, IFormidableMaskField {}

type FormidableGroupFieldsKeys = 'name' | 'disabled';

/** The subset of `<input type="radio"/> properties that are supported.` */
export interface IFormidableRadioGroupField
  extends SignalsOf<Pick<HTMLInputElement, FormidableGroupFieldsKeys>>, IFormidableField, IFormidableOptionField {}

/** The subset of `<input type="checkbox"/> properties that are supported.` */
export interface IFormidableCheckboxGroupField
  extends
    SignalsOf<Pick<HTMLInputElement, FormidableGroupFieldsKeys>>,
    IFormidableField<string[]>,
    IFormidableOptionField {}

/** The subset of `<textarea/>` properties that are supported. */
export interface IFormidableTextareaField
  extends SignalsOf<Pick<HTMLTextAreaElement, FormidableTextareaFieldsKeys>>, IFormidableField, IFormidableMaskField {
  /**
   * Enable or disable autosizing of the textarea.
   * If true, the textarea will automatically adjust its height based on the content.
   */
  enableAutosize: Signal<boolean>;
  showLengthIndicator: Signal<boolean>;
}

/** The subset of `<select/>` properties that are supported. */
export interface IFormidableSelectField
  extends SignalsOf<Pick<HTMLSelectElement, FormidableSelectFieldsKeys>>, IFormidableField, IFormidableOptionField {}

/** A dropdown adds nothing of its own: it is an option field whose list lives in a panel. */
export interface IFormidableDropdownField extends IFormidableField, IFormidableOptionField {}

/** A dropdown whose panel is filtered by what is typed into the field. */
export interface IFormidableAutocompleteField extends IFormidableDropdownField {
  /** The filter text, so a consumer can fetch options for it rather than filtering a list it already has. */
  filterChange$: Observable<string>;
  filterChanged: OutputEmitterRef<string>;
}

/** The subset of `PikadayOptions` that are supported, each as the input the date field declares for it. */
export type IFormidablePikadayOptions = SignalsOf<
  Pick<
    PikadayOptions,
    | 'ariaLabel'
    | 'format'
    | 'defaultDate'
    | 'setDefaultDate'
    | 'firstDay'
    | 'minDate'
    | 'maxDate'
    | 'disableWeekends'
    | 'disableDayFn'
    | 'yearRange'
    | 'i18n'
    | 'yearSuffix'
    | 'showMonthAfterYear'
    | 'showDaysInNextAndPreviousMonths'
    | 'enableSelectionDaysInNextAndPreviousMonths'
    | 'numberOfMonths'
  >
>;

/** A date value entered through a mask, a calendar panel, or the arrow keys. */
export interface IFormidableDateField extends IFormidableField<Date | null>, IFormidablePikadayOptions {
  /** Must be a valid Unicode format (e.g. yyyy-MM-dd). Supported tokens: y, yy, yyy, yyyy, M, MM, MMM, MMMM, d, dd */
  unicodeTokenFormat: Signal<string>;
  /** What an empty field displays in its mask slots. Defaults to `'underscores'`. */
  emptyHint: Signal<FormidableEmptyHint>;
  /** Commits a date from outside the field, as the calendar and the arrow keys do. */
  selectDate(date: Date | null): void;
}

/** A time of day entered through a mask or the arrow keys. Carries a full `Date` whose date part is fixed. */
export interface IFormidableTimeField extends IFormidableField<Date | null> {
  /** Must be a valid Unicode format (e.g. HH:mm:ss). Supported tokens: H, HH, h, hh, m, mm, s, ss, a, aa */
  unicodeTokenFormat: Signal<string>;
  /** What an empty field displays in its mask slots. Defaults to `'underscores'`. */
  emptyHint: Signal<FormidableEmptyHint>;
  /** Commits a time from outside the field, as the arrow keys do. */
  selectTime(time: Date | null): void;
}

/** A boolean rendered as a switch. `inline` is the only decorator layout it fits. */
export interface IFormidableToggleField extends IFormidableField<boolean | null> {
  labelPosition: Signal<FormidableToggleFieldLabelPosition | undefined>;
  /** Text shown beside the switch while on. The field's own label, not a projected one. */
  onLabel: Signal<string | undefined>;
  /** Text shown beside the switch while off. Falls back to `onLabel` when absent. */
  offLabel: Signal<string | undefined>;
  /** Flips the value, as clicking the switch does. */
  toggle(): void;
}

/** A number picked from a bounded range, over a native range input. */
export interface IFormidableSliderField extends IFormidableField<number | null> {
  /** Minimum numeric value of the slider (inclusive). */
  min: Signal<number>;
  /** Maximum numeric value of the slider (inclusive). */
  max: Signal<number>;
  /** Step between slider values. */
  step: Signal<number>;

  /** Optional label for the minimum value (fallback: min as string). */
  minLabel: Signal<string | undefined>;
  /** Optional label for the maximum value (fallback: max as string). */
  maxLabel: Signal<string | undefined>;

  /** Whether to display the thumb label. */
  showThumbLabel: Signal<boolean>;

  /** Whether to show tick marks with labels along the track. */
  showTickMarks: Signal<boolean>;

  /** Whether to display the min/max labels below the track. */
  showMinMaxLabels: Signal<boolean>;

  /** Whether to display labels for tick marks along the track. */
  showTickLabels: Signal<boolean>;

  /**
   * Interval between tick marks. If omitted, `step` is used.
   * Only relevant if `showTickMarks === true`.
   */
  tickInterval: Signal<number | undefined>;

  /**
   * Imperatively select a value from outside (e.g. via template reference).
   * Should clamp & snap to min/max/step.
   */
  selectValue(value: number): void;

  /**
   * Optional value → thumb label transform for value labels.
   * E.g., `value => value + ' %'` or map to named categories.
   */
  transformValueToThumbLabel: Signal<((value: number) => string) | undefined>;

  /**
   * Optional tick → tick label transform for tick labels.
   * E.g., `value => value + ' %'` or map to named categories.
   */
  transformTickToTickLabel: Signal<((value: number) => string) | undefined>;
}
