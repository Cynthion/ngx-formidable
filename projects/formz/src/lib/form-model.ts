import { Observable } from "rxjs";

export const ROOT_FORM = 'rootForm';

export interface FormValidationOptions {
  debounceValidationInMs: number;
}

export interface IFormField {
  fieldId: string | null;
  isLabelFloating: boolean;
}

/**
 * Interface for a custom component that emits value and focus changes.
 */
export interface ICustomFormField {
  valueChange$: Observable<string>;
  focusChange$: Observable<boolean>;
  value: string;
}

export type FormFieldType = 'field' | 'option';
