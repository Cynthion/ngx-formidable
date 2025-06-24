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
  | 'type'
  | 'name'
  | 'placeholder'
  | 'autocomplete'
  | 'minLength'
  | 'maxLength'
  | 'disabled'
  | 'readOnly'
  | 'required';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface IFormzInputField extends Partial<Pick<HTMLInputElement, FormzInputFieldsKeys>> {}
