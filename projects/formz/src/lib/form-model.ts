import { Directive, ElementRef, InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';

export const ROOT_FORM = 'rootForm';

export type FieldDecoratorLayout = 'single' | 'option';

export interface FormValidationOptions {
  debounceValidationInMs: number;
}

export interface IFormzFieldOption {
  value: string;
  label?: string;
  disabled?: boolean;
}

/**
 * Interface for all Formz fields.
 */
export interface IFormzField {
  fieldId: string;
  value: string;
  isLabelFloating: boolean;
  valueChange$: Observable<string>;
  focusChange$: Observable<boolean>;
  elementRef: ElementRef<HTMLElement>;
}

/**
 * Base class for all Formz fields.
 * Required for injection.
 */
@Directive()
export abstract class FormzFieldBase implements IFormzField {
  abstract get fieldId(): string;
  abstract get value(): string;
  abstract get isLabelFloating(): boolean;
  abstract valueChange$: Observable<string>;
  abstract focusChange$: Observable<boolean>;
  abstract get elementRef(): ElementRef<HTMLElement>;
}

/** Interface for all Formz fields that support multiple options. */
export interface IFormzOptionField {
  options?: IFormzFieldOption[];
  emptyOption?: IFormzFieldOption;
  hasOptions: boolean;
  selectOption(option: IFormzFieldOption): void;
}

type FormzInputFieldsKeys =
  | 'name'
  | 'placeholder'
  | 'autocomplete'
  | 'minLength'
  | 'maxLength'
  | 'disabled'
  | 'readOnly'
  | 'required';

/** The subset of `<input/>` properties that are supported. */
export type IFormzInputField = Pick<HTMLInputElement, FormzInputFieldsKeys>;

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

export const FORMZ_OPTION_FIELD = new InjectionToken<IFormzOptionField>('FORMZ_OPTION_FIELD');
