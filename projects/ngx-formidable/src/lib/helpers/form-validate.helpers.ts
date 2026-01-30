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

/**
 * Recursively validates a form value against a form frame.
 *
 * The form frame describes the *allowed shape* of the form model and is used
 * to detect typos or unexpected fields during development.
 *
 * Special cases:
 *
 * 1. Arrays
 *    ----------
 *    Arrays are dynamic in length. The frame is therefore expected to contain
 *    exactly one element at index `0` describing the shape of *all* array items.
 *    When validating array entries with index > 0, we always compare them
 *    against frame index `0`.
 *
 * 2. Records / Dictionaries
 *    ----------------------
 *    Records (`Record<string, T>`) have dynamic keys that are not known upfront.
 *    An *empty object* (`{}`) in the frame is treated as a wildcard and means:
 *
 *      “Any nested keys are allowed below this point.”
 *
 *    In that case, validation stops for this subtree.
 *
 * Validation errors are returned as human-readable strings that include the
 * offending field path.
 */
function validateFormValue(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  formValue: Record<string, any>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  formFrame: Record<string, any>,
  path = ''
): string[] {
  const errors: string[] = [];

  // ─────────────────────────────────────────────────────────────
  // Record wildcard:
  // An empty object in the frame means "accept any nested keys".
  // This is symmetric to the array index-0 rule.
  // ─────────────────────────────────────────────────────────────
  if (typeof formFrame === 'object' && formFrame !== null && Object.keys(formFrame).length === 0) {
    return errors;
  }

  for (const key of Object.keys(formValue)) {
    const value = formValue[key];

    // In form arrays we don't know how many items there are.
    // The frame must provide exactly one entry at index '0'
    // describing the structure of all array elements.
    let keyToCompareWith = key;
    if (!isNaN(parseFloat(key)) && parseFloat(key) > 0) {
      keyToCompareWith = '0';
    }

    const newPath = path ? `${path}.${key}` : key;

    const valueIsObject = typeof value === 'object' && value !== null;

    const frameHasKey = typeof formFrame === 'object' && formFrame !== null && keyToCompareWith in formFrame;

    const frameValue = frameHasKey ? formFrame[keyToCompareWith] : undefined;

    if (valueIsObject) {
      const frameIsObject = typeof frameValue === 'object' && frameValue !== null;

      if (!frameIsObject && isNaN(parseFloat(key))) {
        errors.push(`[ngModelGroup] Form Frame Mismatch: '${newPath}'`);
        continue;
      }

      errors.push(...validateFormValue(value, frameValue as Record<string, unknown>, newPath));
    } else {
      // Primitive leaf value
      if (!frameHasKey && isNaN(parseFloat(key))) {
        errors.push(`[ngModel] Form Frame Mismatch '${newPath}'`);
      }
    }
  }

  return errors;
}
