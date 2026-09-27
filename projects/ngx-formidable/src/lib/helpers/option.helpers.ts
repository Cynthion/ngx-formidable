import {
  FieldDefaultOptionMode,
  FormidableActionOption,
  FormidableOption,
  FormidableOptionSource
} from '../models/formidable.model';

/** Merges an option field's `options` input with its projected option components, sorted if a `sortFn` is given. */
export function combineFieldOptions(
  inlineOptions: FormidableOption[] | undefined,
  projectedOptions: FormidableOption[] | undefined,
  sortFn?: (a: FormidableOption, b: FormidableOption) => number
): FormidableOption[] {
  const combined = [...(inlineOptions ?? []), ...(projectedOptions ?? [])];

  return sortFn ? [...combined].sort(sortFn) : combined;
}

/**
 * Reads every projected option inside an effect, so one changing in place triggers the effect to re-run.
 */
export function trackProjectedOptions(sources: readonly FormidableOptionSource[]): void {
  for (const source of sources) {
    try {
      source.option();
    } catch {
      // not bound yet
    }
  }
}

/** Puts a field's `defaultOption` in front of its options, or in their place — see `FieldDefaultOptionMode`. */
export function applyDefaultOption(
  options: FormidableOption[],
  defaultOption?: FormidableOption,
  mode: FieldDefaultOptionMode = 'always'
): FormidableOption[] {
  if (!defaultOption) return options;

  if (mode === 'fallback') {
    return options.length ? options : [defaultOption];
  }

  return [defaultOption, ...options];
}

/**
 * Puts a panel field's `actionOption` at the end of its rendered list — the mirror of `applyDefaultOption`,
 * which pins to the front. `fallback` counts the list it is handed, so a `defaultOption` already in it keeps
 * the list from being empty.
 */
export function applyActionOption(
  options: FormidableOption[],
  actionOption?: FormidableActionOption,
  mode: FieldDefaultOptionMode = 'always'
): FormidableOption[] {
  if (!actionOption) return options;

  if (mode === 'fallback' && options.length) return options;

  return [...options, actionOption];
}

/**
 * Where the keyboard highlight lands next, skipping disabled and readonly options and wrapping at both ends.
 * Returns `-1` when no option can take it, so a list of nothing but disabled entries highlights none.
 */
export function getNextAvailableOptionIndex(
  currentIndex: number,
  options: FormidableOption[],
  direction: 'up' | 'down'
): number {
  const n = options.length;
  if (!n) return -1;

  const isAvailable = (o?: FormidableOption) => !!o && !o.disabled && !o.readonly;

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
