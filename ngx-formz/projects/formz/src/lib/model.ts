import { Observable } from "rxjs";

export const ROOT_FORM = 'rootForm';

export interface FormValidationOptions {
  debounceValidationInMs: number;
}

/**
 * Interface for a custom component that emits value and focus changes.
 */
export interface HasValueAndFocusChange {
  valueChange$: Observable<string>;
  focusChange$: Observable<boolean>;
  value: string;
}

export type FormFieldType = 'field' | 'option';
