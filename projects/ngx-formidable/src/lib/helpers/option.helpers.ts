import { IFormidableFieldOption } from '../models/formidable.model';

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
