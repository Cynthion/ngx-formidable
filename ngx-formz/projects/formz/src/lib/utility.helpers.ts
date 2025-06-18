/**
 * Performs a deep-clone of an object.
 */
export function cloneDeep<T>(obj: T): T {
  // handle primitives (null, undefined, boolean, string, number, function)
  if (isPrimitive(obj)) {
    return obj;
  }

  // handle Date
  if (obj instanceof Date) {
    return new Date(obj.getTime()) as unknown as T;
  }

  // handle Array
  if (Array.isArray(obj)) {
    return obj.map((item) => cloneDeep(item)) as unknown as T;
  }

  // handle Object
  if (obj instanceof Object) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const clonedObj: any = {};
    for (const key in obj) {
      // eslint-disable-next-line no-prototype-builtins
      if (obj.hasOwnProperty(key)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        clonedObj[key] = cloneDeep((obj as any)[key]);
      }
    }
    return clonedObj as T;
  }

  throw new Error('Unable to clone object! Its type is not supported.');
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
type Primitive = undefined | null | boolean | string | number | Function;

function isPrimitive(value: unknown): value is Primitive {
  return value === null || (typeof value !== 'object' && typeof value !== 'function');
}
