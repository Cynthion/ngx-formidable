// Source: https://github.dev/simplifiedcourses/ngx-vest-forms

import { AbstractControl, FormArray, FormGroup } from '@angular/forms';
import { ROOT_FORM } from './formz.model';

/**
 * Merges a forms values and raw values.
 * This ensures that values of disabled form fields are included.
 */
export function mergeValuesAndRawValues<T>(form: FormGroup): T {
  // values (respecting references)
  const value = { ...form.value };

  // raw values (including disabled values)
  const rawValue = form.getRawValue();

  // merge raw values into values
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function mergeRecursive(target: any, source: any) {
    Object.keys(source).forEach((key) => {
      if (target[key] === undefined) {
        // key is not in the target, add it directly (for disabled fields)
        target[key] = source[key];
      } else if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
        // value is an object, merge it recursively
        mergeRecursive(target[key], source[key]);
      }

      // values is a primitive, left as is to maintain reference
    });
  }

  mergeRecursive(value, rawValue);

  return value;
}

/**
 * Traverses a forms controls and returns the errors by path.
 */
export function getAllFormErrors(form?: AbstractControl): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!form) {
    return errors;
  }

  collect(form, '');

  if (form.errors && form.errors!['errors']) {
    errors[ROOT_FORM] = form.errors && form.errors!['errors'];
  }

  return errors;

  function collect(control: AbstractControl, path: string): void {
    if (control instanceof FormGroup || control instanceof FormArray) {
      Object.keys(control.controls).forEach((key) => {
        const childControl = control.get(key);
        const controlPath = path ? `${path}.${key}` : key;

        if (path && control.errors && control.enabled) {
          Object.keys(control.errors).forEach((errorKey) => {
            errors[path] = control.errors![errorKey];
          });
        }

        if (childControl) {
          collect(childControl, controlPath);
        }
      });
    } else {
      if (control.errors && control.enabled) {
        Object.keys(control.errors).forEach((errorKey) => {
          errors[path] = control.errors![errorKey];
        });
      }
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

/**
 * Calculates the field name of a form control (e.g., customer.address.street).
 */
export function getFormControlFieldPath(formGroup: FormGroup, control: AbstractControl): string {
  return getControlPath(formGroup, control);
}

/**
 * Calcuates the field name of a form group (e.g., customer.address).
 */
export function getFormGroupFieldPath(formGroup: FormGroup, control: AbstractControl): string {
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
