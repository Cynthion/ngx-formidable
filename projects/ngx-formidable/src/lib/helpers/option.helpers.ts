import { FieldDefaultOptionMode, IFormidableFieldOption } from '../models/formidable.model';

/** Merges an option field's `options` input with its projected option components, sorted if a `sortFn` is given. */
export function combineFieldOptions(
  inlineOptions: IFormidableFieldOption[] | undefined,
  projectedOptions: IFormidableFieldOption[] | undefined,
  sortFn?: (a: IFormidableFieldOption, b: IFormidableFieldOption) => number
): IFormidableFieldOption[] {
  const combined = [...(inlineOptions ?? []), ...(projectedOptions ?? [])];

  return sortFn ? [...combined].sort(sortFn) : combined;
}

/** Puts a field's `defaultOption` in front of its options, or in their place — see `FieldDefaultOptionMode`. */
export function applyDefaultOption(
  options: IFormidableFieldOption[],
  defaultOption?: IFormidableFieldOption,
  mode: FieldDefaultOptionMode = 'always'
): IFormidableFieldOption[] {
  if (!defaultOption) return options;

  if (mode === 'fallback') {
    return options.length ? options : [defaultOption];
  }

  return [defaultOption, ...options];
}

export function getNextAvailableOptionIndex(
  currentIndex: number,
  options: IFormidableFieldOption[],
  direction: 'up' | 'down'
): number {
  const n = options.length;
  if (!n) return -1;

  const isAvailable = (o?: IFormidableFieldOption) => !!o && !o.disabled && !o.readonly;

  if (options.every((o) => !isAvailable(o))) return -1;

  const step = direction === 'down' ? 1 : -1;

  let idx = currentIndex;

  for (let i = 0; i < n; i++) {
    idx = (idx + step + n) % n; // wrap around
    if (isAvailable(options[idx])) {
      return idx;
    }
  }

  return -1;
}
