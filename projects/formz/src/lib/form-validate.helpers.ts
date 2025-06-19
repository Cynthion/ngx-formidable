import { isDevMode } from '@angular/core';

// Source: https://github.dev/simplifiedcourses/ngx-vest-forms

export class FormShapeMismatchError extends Error {
  constructor(errorList: string[]) {
    super(`Form shape mismatch:\n\n${errorList.join('\n')}\n\n`);
  }
}

/**
 * Validates a form value against a form shape.
 * If value and shape do not match, an error is thrown.
 * Only in Angular Dev Mode.
 */
export function validateFormShape(formValue: Record<string, unknown>, formShape: Record<string, unknown>): void {
  // Only execute in dev mode
  if (isDevMode()) {
    const errors = validateFormValue(formValue, formShape);

    if (errors.length) {
      throw new FormShapeMismatchError(errors);
    }
  }
}

function validateFormValue(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  formValue: Record<string, any>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  formShape: Record<string, any>,
  path = ''
): string[] {
  const errors: string[] = [];
  for (const key in formValue) {
    if (Object.keys(formValue).includes(key)) {
      // In form arrays we don't know how many items there are.
      // This means that we always need to provide one record in the shape of our form array.
      // So every time reset the key to '0' when the key is a number and is bigger than 0.
      let keyToCompareWith = key;

      if (parseFloat(key) > 0) {
        keyToCompareWith = '0';
      }

      const newPath = path ? `${path}.${key}` : key;

      if (typeof formValue[key] === 'object' && formValue[key] !== null) {
        if (
          (typeof formShape[keyToCompareWith] !== 'object' || formShape[keyToCompareWith] === null) &&
          isNaN(parseFloat(key))
        ) {
          errors.push(`[ngModelGroup] Form Shape Mismatch: '${newPath}'`);
        }
        errors.push(...validateFormValue(formValue[key], formShape[keyToCompareWith], newPath));
      } else if ((formShape ? !(key in formShape) : true) && isNaN(parseFloat(key))) {
        errors.push(`[ngModel] Form Shape Mismatch '${newPath}'`);
      }
    }
  }

  return errors;
}
