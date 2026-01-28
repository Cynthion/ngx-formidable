type Primitive = string | number | boolean | bigint | symbol | null | undefined;
type BuiltinLeaf = Date | RegExp;

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
