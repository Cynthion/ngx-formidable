import { AbstractControl, FormArray, FormGroup } from '@angular/forms';
import { FormidableErrorExtractorFn, FormidableFormErrors, WHOLE_FORM } from '../models/validation.model';

/**
 * Merges a forms values and raw values.
 * This ensures that values of disabled form fields are included.
 */
export function mergeValuesAndRawValues<T>(form: FormGroup): T {
  // values (respecting references), filled from the raw values (which include disabled fields)
  return fillMissing({ ...form.value }, form.getRawValue());
}

/**
 * Fills the keys `target` does not have from `source`, recursing into nested objects. The target wins
 * wherever it says anything at all — `null` and `''` included, so a cleared value beats a stale one.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function fillMissing<T>(target: T, source: any): T {
  if (!source) {
    return target;
  }

  Object.keys(source).forEach((key) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const t = target as any;

    if (t[key] === undefined) {
      t[key] = source[key];
    } else if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
      fillMissing(t[key], source[key]);
    }

    // a primitive the target already has is left as is, to maintain reference
  });

  return target;
}

/**
 * Traverses a form's controls and returns every error message, keyed by the target that reported it.
 *
 * Each entry is normalised through `extractErrors`, so a form mixing the provided validator with Angular's
 * own ends up with one homogeneous map instead of message arrays next to raw `true`s and option objects.
 */
export function getAllFormErrors(
  form: AbstractControl | undefined,
  extractErrors: FormidableErrorExtractorFn
): FormidableFormErrors {
  const errors: FormidableFormErrors = {};

  if (!form) {
    return errors;
  }

  collect(form, '');

  const wholeFormMessages = extractErrors(form.errors);

  if (wholeFormMessages.length) {
    errors[WHOLE_FORM] = wholeFormMessages;
  }

  return errors;

  function collect(control: AbstractControl, path: string): void {
    // The root's own errors are the whole-form ones, added above under `WHOLE_FORM` rather than under `''`.
    if (path && control.errors && control.enabled) {
      const messages = extractErrors(control.errors);

      if (messages.length) {
        errors[path] = messages;
      }
    }

    if (control instanceof FormGroup || control instanceof FormArray) {
      Object.keys(control.controls).forEach((key) => {
        const childControl = control.get(key);

        if (childControl) {
          collect(childControl, path ? `${path}.${key}` : key);
        }
      });
    }
  }
}

/**
 * Sets a value in an object at the correct path.
 */
export function set(obj: object, path: string, value: unknown): void {
  const keys: string[] = path.split('.');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let current: any = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    const key: string = keys[i]!;

    if (!current[key]) {
      current[key] = {};
    }

    current = current[key];
  }

  current[keys[keys.length - 1]!] = value;
}

/** The dotted target of a form control (e.g. `customer.address.street`). */
export function getFieldTarget(formGroup: FormGroup, control: AbstractControl): string {
  return getControlPath(formGroup, control);
}

/** The dotted target of a form group (e.g. `customer.address`). */
export function getGroupTarget(formGroup: FormGroup, control: AbstractControl): string {
  return getGroupPath(formGroup, control);
}

function getControlPath(formGroup: FormGroup, control: AbstractControl): string {
  for (const key in formGroup.controls) {
    // eslint-disable-next-line no-prototype-builtins
    if (formGroup.controls.hasOwnProperty(key)) {
      const ctrl = formGroup.get(key);

      if (ctrl instanceof FormGroup) {
        const path = getControlPath(ctrl, control);

        if (path) {
          return key + '.' + path;
        }
      } else if (ctrl === control) {
        return key;
      }
    }
  }
  return '';
}

function getGroupPath(formGroup: FormGroup, control: AbstractControl): string {
  for (const key in formGroup.controls) {
    // eslint-disable-next-line no-prototype-builtins
    if (formGroup.controls.hasOwnProperty(key)) {
      const ctrl = formGroup.get(key);

      if (ctrl === control) {
        return key;
      }

      if (ctrl instanceof FormGroup) {
        const path = getGroupPath(ctrl, control);

        if (path) {
          return key + '.' + path;
        }
      }
    }
  }
  return '';
}
