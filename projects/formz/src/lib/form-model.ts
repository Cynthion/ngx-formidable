import { Directive, ElementRef, InjectionToken, TemplateRef } from '@angular/core';
import { PikadayOptions } from 'pikaday';
import { Observable } from 'rxjs';

export const ROOT_FORM = 'rootForm';

/** InjectionToken for field components that support multiple options. */
export const FORMZ_OPTION_FIELD = new InjectionToken<IFormzOptionField>('FORMZ_OPTION_FIELD');

/** InjectionToken for option components that can be used in field components that support multiple options. */
export const FORMZ_FIELD_OPTION = new InjectionToken<IFormzFieldOption>('FORMZ_FIELD_OPTION');

export type FieldDecoratorLayout = 'single' | 'group';
export type FieldOptionLayout = 'inline' | 'radio-group' | 'checkbox-group';

export interface FormValidationOptions {
  debounceValidationInMs: number;
}

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

/**
 * Interface for all Formz fields.
 */
export interface IFormzField<T = string> {
  fieldId: string;
  value: T;
  isLabelFloating: boolean;
  valueChange$: Observable<T>;
  focusChange$: Observable<boolean>;
  elementRef: ElementRef<HTMLElement>;
}

/**
 * Base class for all Formz fields.
 * Required for injection.
 */
@Directive()
export abstract class FormzFieldBase<T = string> implements IFormzField<T> {
  abstract get fieldId(): string;
  abstract get value(): T;
  abstract get isLabelFloating(): boolean;
  abstract valueChange$: Observable<T>;
  abstract focusChange$: Observable<boolean>;
  abstract get elementRef(): ElementRef<HTMLElement>;
}

/** Interface for all Formz fields that support multiple options. */
export interface IFormzOptionField {
  options?: IFormzFieldOption[];
  emptyOption?: IFormzFieldOption;
  selectOption(option: IFormzFieldOption): void;
}

type FormzInputFieldsKeys =
  | 'name'
  | 'placeholder'
  | 'autocomplete'
  | 'minLength'
  | 'maxLength'
  | 'readOnly'
  | 'disabled'
  | 'required';

/** The subset of `<input/>` properties that are supported. */
export type IFormzInputField = Pick<HTMLInputElement, FormzInputFieldsKeys>;

type FormzRadioGroupFieldsKeys = 'name' | 'disabled' | 'required';

/** The subset of `<input type="radio"/> properties that are supported.` */
export interface IFormzRadioGroupField extends Pick<HTMLInputElement, FormzRadioGroupFieldsKeys>, IFormzOptionField {}

type FormzCheckboxGroupFieldsKeys = FormzRadioGroupFieldsKeys;

/** The subset of `<input type="checkbox"/> properties that are supported.` */
export interface IFormzCheckboxGroupField
  extends Pick<HTMLInputElement, FormzCheckboxGroupFieldsKeys>,
    IFormzOptionField {}

type FormzTextareaFieldsKeys = FormzInputFieldsKeys;

/** The subset of `<textarea/>` properties that are supported. */
export type IFormzTextareaField = Pick<HTMLTextAreaElement, FormzTextareaFieldsKeys>;

type FormzSelectFieldsKeys = 'name' | 'disabled' | 'required';

/** The subset of `<select/>` properties that are supported. */
export interface IFormzSelectField extends Pick<HTMLSelectElement, FormzSelectFieldsKeys>, IFormzOptionField {}

export interface IFormzDropdownField extends IFormzOptionField {
  name: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
}

export type IFormzAutocompleteField = IFormzDropdownField;

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

export interface IFormzDateField extends IFormzPikadayOptions {
  name: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  // TODO implement
  maskFormat: 'YYYY-MM-DD' | 'DD.MM.YYYY' | string;
  // pattern?: string;
  // mask?: string;
  selectDate(date: string): void;
}
