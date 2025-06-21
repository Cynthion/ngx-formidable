import { ElementRef } from '@angular/core';
import { ControlValueAccessor } from '@angular/forms';
import { Observable } from 'rxjs';

export const ROOT_FORM = 'rootForm';

export interface FormValidationOptions {
  debounceValidationInMs: number;
}

/**
 * Interface for all Formz fields.
 * It extends ControlValueAccessor to integrate with Angular forms.
 */
export interface IFormzField extends ControlValueAccessor {
  fieldId: string;
  value: string;
  isLabelFloating: boolean;
  valueChange$: Observable<string>;
  focusChange$: Observable<boolean>;
  elementRef: ElementRef<HTMLElement>;
}

export type FieldDecoratorLayout = 'single' | 'option';
