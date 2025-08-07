import { isDevMode } from '@angular/core';

export class FormFrameMismatchError extends Error {
  constructor(errorList: string[]) {
    super(`Form frame mismatch:\n\n${errorList.join('\n')}\n\n`);
  }
}

/**
 * Validates a form value against a form frame.
 * If value and frame do not match, an error is thrown.
 * Only in Angular Dev Mode.
 */
export function validateFormFrame(formValue: Record<string, unknown>, formFrame: Record<string, unknown>): void {
  // Only execute in dev mode
  if (isDevMode()) {
    const errors = validateFormValue(formValue, formFrame);

    if (errors.length) {
      throw new FormFrameMismatchError(errors);
    }
  }
}

function validateFormValue(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  formValue: Record<string, any>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  formFrame: Record<string, any>,
  path = ''
): string[] {
  const errors: string[] = [];
  for (const key in formValue) {
    if (Object.keys(formValue).includes(key)) {
      // In form arrays we don't know how many items there are.
      // This means that we always need to provide one record in the frame of our form array.
      // So every time reset the key to '0' when the key is a number and is bigger than 0.
      let keyToCompareWith = key;

      if (parseFloat(key) > 0) {
        keyToCompareWith = '0';
      }

      const newPath = path ? `${path}.${key}` : key;

      if (typeof formValue[key] === 'object' && formValue[key] !== null) {
        if (
          (typeof formFrame[keyToCompareWith] !== 'object' || formFrame[keyToCompareWith] === null) &&
          isNaN(parseFloat(key))
        ) {
          errors.push(`[ngModelGroup] Form Frame Mismatch: '${newPath}'`);
        }
        errors.push(...validateFormValue(formValue[key], formFrame[keyToCompareWith], newPath));
      } else if ((formFrame ? !(key in formFrame) : true) && isNaN(parseFloat(key))) {
        errors.push(`[ngModel] Form Frame Mismatch '${newPath}'`);
      }
    }
  }

  return errors;
}
