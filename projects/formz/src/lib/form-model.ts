import { Directive, ElementRef } from '@angular/core';
import { Observable } from 'rxjs';

export const ROOT_FORM = 'rootForm';

export type FieldDecoratorLayout = 'single' | 'option';

export interface FormValidationOptions {
  debounceValidationInMs: number;
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
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface IFormzInputField extends Pick<HTMLInputElement, FormzInputFieldsKeys> {}

type FormzTextareaFieldsKeys = FormzInputFieldsKeys;

/** The subset of `<textarea/>` properties that are supported. */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface IFormzTextareaField extends Pick<HTMLTextAreaElement, FormzTextareaFieldsKeys> {}

type FormzSelectFieldsKeys = 'name' | 'disabled' | 'required';

/** The subset of `<select/>` properties that are supported. */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface IFormzSelectField extends Pick<HTMLSelectElement, FormzSelectFieldsKeys> {}

export interface IFormzDropdownField {
  name: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
}
