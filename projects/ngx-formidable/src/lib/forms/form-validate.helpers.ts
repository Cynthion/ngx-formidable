import { isDevMode } from '@angular/core';

/** Thrown in dev mode when the form's value carries a key its `formShape` does not declare. */
export class FormShapeMismatchError extends Error {
  constructor(errorList: string[]) {
    super(`Form shape mismatch:\n\n${errorList.join('\n')}\n\n`);
  }
}

/**
 * Checks a form value against the model's shape and throws if they do not match.
 * Dev mode only.
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

/**
 * Recursively checks a form value against the model's shape, which describes every key the model may carry
 * and so catches typos and unexpected keys during development.
 *
 * Two special cases:
 *
 * 1. **Arrays** are dynamic in length, so the shape carries exactly one element at index `0` describing all
 *    items. Entries at index > 0 are compared against that one.
 * 2. **Records** have keys that are not known upfront, so an empty object (`{}`) in the shape is a wildcard
 *    meaning "any nested keys are allowed here", and the subtree is not checked further.
 *
 * Mismatches come back as human-readable strings naming the offending target.
 */
function validateFormValue(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  formValue: Record<string, any>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  formShape: Record<string, any>,
  path = ''
): string[] {
  const errors: string[] = [];

  // Record wildcard: an empty object in the shape means "accept any nested keys", symmetric to the
  // array index-0 rule below.
  if (typeof formShape === 'object' && formShape !== null && Object.keys(formShape).length === 0) {
    return errors;
  }

  for (const key of Object.keys(formValue)) {
    const value = formValue[key];

    // In form arrays we don't know how many items there are. The shape must provide exactly one entry at
    // index '0' describing the structure of all array elements.
    let keyToCompareWith = key;
    if (!isNaN(parseFloat(key)) && parseFloat(key) > 0) {
      keyToCompareWith = '0';
    }

    const newPath = path ? `${path}.${key}` : key;

    const valueIsObject = typeof value === 'object' && value !== null;

    const shapeHasKey = typeof formShape === 'object' && formShape !== null && keyToCompareWith in formShape;

    const shapeValue = shapeHasKey ? formShape[keyToCompareWith] : undefined;

    if (valueIsObject) {
      const shapeIsObject = typeof shapeValue === 'object' && shapeValue !== null;

      if (!shapeIsObject && isNaN(parseFloat(key))) {
        errors.push(`[ngModelGroup] Form shape mismatch: '${newPath}'`);
        continue;
      }

      errors.push(...validateFormValue(value, shapeValue as Record<string, unknown>, newPath));
    } else {
      // Primitive leaf value
      if (!shapeHasKey && isNaN(parseFloat(key))) {
        errors.push(`[ngModel] Form shape mismatch: '${newPath}'`);
      }
    }
  }

  return errors;
}
