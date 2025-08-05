import { ElementRef, EventEmitter, InjectionToken, TemplateRef } from '@angular/core';
import { PikadayOptions } from 'pikaday';
import { Observable } from 'rxjs';

export const ROOT_FORM = 'rootForm';

/** InjectionToken for field components. */
export const FORMIDABLE_FIELD = new InjectionToken<IFormidableField>('FORMIDABLE_FIELD');

/** InjectionToken for field components that support multiple options. */
export const FORMIDABLE_OPTION_FIELD = new InjectionToken<IFormidableOptionField>('FORMIDABLE_OPTION_FIELD');

/** InjectionToken for option components that can be used in field components that support multiple options. */
export const FORMIDABLE_FIELD_OPTION = new InjectionToken<IFormidableFieldOption>('FORMIDABLE_FIELD_OPTION');

export const EMPTY_FIELD_OPTION: IFormidableFieldOption = {
  value: 'empty',
  label: 'No options available.',
  disabled: true
};

export type FieldDecoratorLayout = 'single' | 'group';
export type FieldOptionLayout = 'inline' | 'radio-group' | 'checkbox-group';
export type FormidablePanelPosition = 'left' | 'right' | 'full';

export interface FormValidationOptions {
  debounceValidationInMs: number;
}

/**
 * Interface for all Formidable fields.
 */
export interface IFormidableField<T = string | null> {
  fieldRef: ElementRef<HTMLElement>;
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

/** Interface for all Formidable fields that support multiple options. */
export interface IFormidableOptionField {
  options?: IFormidableFieldOption[];
  emptyOption?: IFormidableFieldOption;
  selectOption(option: IFormidableFieldOption): void;
  sortFn?: (a: IFormidableFieldOption, b: IFormidableFieldOption) => number;
}

/** Interface for all Formidable options. */
export interface IFormidableFieldOption<T = unknown> {
  value: string;
  label?: string;
  template?: TemplateRef<T>;
  disabled?: boolean;
  selected?: boolean;
  highlighted?: boolean;
  select?: () => void;
  match?: (filterValue: string) => boolean;
}

/** Interface for all Formidable fields that have a panel. */
export interface IFormidablePanelField {
  panelRef?: ElementRef<HTMLElement>;
  isPanelOpen: boolean;
  togglePanel(isOpen: boolean): void;
  panelPosition: FormidablePanelPosition;
}

type FormidableInputFieldsKeys =
  | 'name'
  | 'placeholder'
  | 'autocomplete'
  | 'minLength'
  | 'maxLength'
  | 'readOnly'
  // | 'disabled'
  | 'required';

type FormidableTextareaFieldsKeys = FormidableInputFieldsKeys;

type FormidableSelectFieldsKeys =
  | 'name'
  //  | 'disabled'
  | 'required';

/** The subset of `<input/>` properties that are supported. */
export interface IFormidableInputField extends Pick<HTMLInputElement, FormidableInputFieldsKeys>, IFormidableField {}

type FormidableGroupFieldsKeys =
  | 'name'
  // | 'disabled'
  | 'required';

/** The subset of `<input type="radio"/> properties that are supported.` */
export interface IFormidableRadioGroupField
  extends Pick<HTMLInputElement, FormidableGroupFieldsKeys>,
    IFormidableField,
    IFormidableOptionField {}

/** The subset of `<input type="checkbox"/> properties that are supported.` */
export interface IFormidableCheckboxGroupField
  extends Pick<HTMLInputElement, FormidableGroupFieldsKeys>,
    IFormidableField<string[]>,
    IFormidableOptionField {}

/** The subset of `<textarea/>` properties that are supported. */
export interface IFormidableTextareaField
  extends Pick<HTMLTextAreaElement, FormidableTextareaFieldsKeys>,
    IFormidableField {
  /**
   * Enable or disable autosizing of the textarea.
   * If true, the textarea will automatically adjust its height based on the content.
   */
  enableAutosize: boolean;
  showLengthIndicator?: boolean;
}

/** The subset of `<select/>` properties that are supported. */
export interface IFormidableSelectField
  extends Pick<HTMLSelectElement, FormidableSelectFieldsKeys>,
    IFormidableField,
    IFormidableOptionField {}

export interface IFormidableDropdownField extends IFormidableField, IFormidableOptionField {
  name: string;
  placeholder?: string;
  required?: boolean;
}

export interface IFormidableAutocompleteField extends IFormidableDropdownField {
  filterChange$: Observable<string>;
  filterChanged: EventEmitter<string>;
}

/** The subset of `PikadayOptions` that are supported. */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface IFormidablePikadayOptions
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

export interface IFormidableDateField extends IFormidableField<Date | null>, IFormidablePikadayOptions {
  name: string;
  placeholder?: string;
  required?: boolean;
  /** Must be a valid Unicode format. (Supported tokens: y, yy, yyy, yyyy, M, MM, MMM, MMMM, d, dd) */
  unicodeTokenFormat: string;
  selectDate(date: Date | null): void;
}

export interface IFormidableTimeField extends IFormidableField<Date | null> {
  name: string;
  placeholder?: string;
  required?: boolean;
  /** Must be a valid Unicode format. (Supported tokens:   'H', 'HH', 'h', 'hh', 'm', 'mm', 's', 'ss', 'a', 'aa') */
  unicodeTokenFormat: string;
  selectTime(time: Date | null): void;
}
