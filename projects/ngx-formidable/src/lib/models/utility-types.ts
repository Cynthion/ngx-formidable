import { Signal } from '@angular/core';

type Primitive = string | number | boolean | bigint | symbol | null | undefined;
type BuiltinLeaf = Date | RegExp;

/**
 * The same members, each as the signal a component declares for it. Lets an interface describe a component's
 * input surface without restating the member list — `Signal` is covariant, so a narrower `InputSignal` fits.
 */
// Not `readonly`: an interface extending both this and `IFormidableField` needs the two declarations of a
// shared member (`name`, `disabled`) to be *identical*, and a modifier is enough to make them differ.
export type SignalsOf<T> = { [K in keyof T]: Signal<T[K]> };

/** Every key optional, all the way down. `Date` and `RegExp` are treated as leaves, not walked into. */
export type DeepPartial<T> = T extends Primitive
  ? T
  : T extends BuiltinLeaf
    ? T
    : T extends readonly (infer U)[]
      ? readonly DeepPartial<U>[]
      : T extends (infer U)[]
        ? DeepPartial<U>[]
        : T extends object
          ? { [P in keyof T]?: DeepPartial<T[P]> }
          : T;

/**
 * Every key required, all the way down — the type a `formShape` is written as, so a typo in a model key or a
 * validation target is a compile error rather than a rule that silently never runs.
 */
export type DeepRequired<T> = T extends Primitive
  ? Exclude<T, undefined> // optional: remove undefined
  : T extends BuiltinLeaf
    ? T
    : T extends readonly (infer U)[]
      ? readonly DeepRequired<U>[]
      : T extends (infer U)[]
        ? DeepRequired<U>[]
        : T extends object
          ? { [K in keyof T]-?: DeepRequired<T[K]> }
          : T;
