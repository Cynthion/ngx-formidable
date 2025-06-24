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
  readonly: boolean;
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
  abstract get readonly(): boolean;
}
