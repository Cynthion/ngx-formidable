import { ElementRef, EventEmitter, InjectionToken, TemplateRef } from '@angular/core';
import { PikadayOptions } from 'pikaday';
import { Observable } from 'rxjs';

export const ROOT_FORM = 'rootForm';

/** InjectionToken for field components. */
export const FORMZ_FIELD = new InjectionToken<IFormzField>('FORMZ_FIELD');

/** InjectionToken for field components that support multiple options. */
export const FORMZ_OPTION_FIELD = new InjectionToken<IFormzOptionField>('FORMZ_OPTION_FIELD');

/** InjectionToken for option components that can be used in field components that support multiple options. */
export const FORMZ_FIELD_OPTION = new InjectionToken<IFormzFieldOption>('FORMZ_FIELD_OPTION');

export const EMPTY_FIELD_OPTION: IFormzFieldOption = { value: 'empty', label: 'No options available.', disabled: true };

export type FieldDecoratorLayout = 'single' | 'group';
export type FieldOptionLayout = 'inline' | 'radio-group' | 'checkbox-group';
export type FormzPanelPosition = 'left' | 'right' | 'full';

export interface FormValidationOptions {
  debounceValidationInMs: number;
}

/**
 * Interface for all Formz fields.
 */
export interface IFormzField<T = string> {
  elementRef: ElementRef<HTMLElement>; // TODO rename to fieldRef
  fieldId: string;
  disabled: boolean;
  value: T;
  isLabelFloating: boolean;
  valueChange$: Observable<T>;
  focusChange$: Observable<boolean>;
  valueChanged: EventEmitter<T>;
  focusChanged: EventEmitter<boolean>;
  decoratorLayout: FieldDecoratorLayout;
}

/** Interface for all Formz fields that support multiple options. */
export interface IFormzOptionField {
  options?: IFormzFieldOption[];
  emptyOption?: IFormzFieldOption;
  selectOption(option: IFormzFieldOption): void;
}

/** Interface for all Formz options. */
export interface IFormzFieldOption<T = unknown> {
  value: string;
  label?: string;
  template?: TemplateRef<T>;
  disabled?: boolean;
  selected?: boolean;
  highlighted?: boolean;
  select?: () => void;
  match?: (filterValue: string) => boolean;
}

/** Interface for all Formz fields that have a panel. */
export interface IFormzPanelField {
  panelRef?: ElementRef<HTMLElement>;
  isPanelOpen: boolean;
  togglePanel(isOpen: boolean): void;
  panelPosition: FormzPanelPosition;
}

type FormzInputFieldsKeys =
  | 'name'
  | 'placeholder'
  | 'autocomplete'
  | 'minLength'
  | 'maxLength'
  | 'readOnly'
  // | 'disabled'
  | 'required';

type FormzTextareaFieldsKeys = FormzInputFieldsKeys;

type FormzSelectFieldsKeys =
  | 'name'
  //  | 'disabled'
  | 'required';

/** The subset of `<input/>` properties that are supported. */
export interface IFormzInputField extends Pick<HTMLInputElement, FormzInputFieldsKeys>, IFormzField {}

type FormzGroupFieldsKeys =
  | 'name'
  // | 'disabled'
  | 'required';

/** The subset of `<input type="radio"/> properties that are supported.` */
export interface IFormzRadioGroupField
  extends Pick<HTMLInputElement, FormzGroupFieldsKeys>,
    IFormzField,
    IFormzOptionField {}

/** The subset of `<input type="checkbox"/> properties that are supported.` */
export interface IFormzCheckboxGroupField
  extends Pick<HTMLInputElement, FormzGroupFieldsKeys>,
    IFormzField<string[]>,
    IFormzOptionField {}

/** The subset of `<textarea/>` properties that are supported. */
export interface IFormzTextareaField extends Pick<HTMLTextAreaElement, FormzTextareaFieldsKeys>, IFormzField {
  /**
   * Enable or disable autosizing of the textarea.
   * If true, the textarea will automatically adjust its height based on the content.
   */
  enableAutosize: boolean;
}

/** The subset of `<select/>` properties that are supported. */
export interface IFormzSelectField
  extends Pick<HTMLSelectElement, FormzSelectFieldsKeys>,
    IFormzField,
    IFormzOptionField {}

export interface IFormzDropdownField extends IFormzField, IFormzOptionField {
  name: string;
  placeholder?: string;
  required?: boolean;
}

export interface IFormzAutocompleteField extends IFormzDropdownField {
  filterChange$: Observable<string>;
  filterChanged: EventEmitter<string>;
}

/** The subset of `PikadayOptions` that are supported. */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface IFormzPikadayOptions
  extends Pick<
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
  > {}

export interface IFormzDateField extends IFormzField<Date | null>, IFormzPikadayOptions {
  name: string;
  placeholder?: string;
  required?: boolean;
  /** Must be a valid Unicode format. (Supported tokens: y, yy, yyy, yyyy, M, MM, MMM, MMMM, d, dd) */
  unicodeTokenFormat: string;
  selectDate(date: Date | null): void;
}

export interface IFormzTimeField extends IFormzField<Date | null> {
  name: string;
  placeholder?: string;
  required?: boolean;
  /** Must be a valid Unicode format. */ // TODO
  unicodeTokenFormat: string;
  selectTime(time: Date | null): void;
}

export type FormzIconSize = 16 | 24 | 32 | 48 | 64 | 128; // TODO remove
