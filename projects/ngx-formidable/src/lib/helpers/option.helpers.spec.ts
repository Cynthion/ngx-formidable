import { IFormidableFieldOption } from '../models/formidable.model';
import { applyDefaultOption, combineFieldOptions, getNextAvailableOptionIndex } from './option.helpers';

const option = (value: string, extra: Partial<IFormidableFieldOption> = {}): IFormidableFieldOption => ({
  value,
  label: value.toUpperCase(),
  ...extra
});

const byValue = (a: IFormidableFieldOption, b: IFormidableFieldOption) => a.value.localeCompare(b.value);

describe('option.helpers', () => {
  describe('combineFieldOptions', () => {
    it('keeps inline options before projected ones', () => {
      const combined = combineFieldOptions([option('a')], [option('b')]);

      expect(combined.map((o) => o.value)).toEqual(['a', 'b']);
    });

    it('sorts across both sources when a sortFn is given', () => {
      const combined = combineFieldOptions([option('d'), option('b')], [option('c'), option('a')], byValue);

      expect(combined.map((o) => o.value)).toEqual(['a', 'b', 'c', 'd']);
    });

    it('does not mutate its inputs', () => {
      const inline = [option('d'), option('b')];

      combineFieldOptions(inline, [], byValue);

      expect(inline.map((o) => o.value)).toEqual(['d', 'b']);
    });

    it('treats missing sources as empty', () => {
      expect(combineFieldOptions(undefined, undefined)).toEqual([]);
    });
  });

  describe('applyDefaultOption', () => {
    const options = [option('a'), option('b')];
    const fallback = option('none');

    it('is a no-op without a default option', () => {
      expect(applyDefaultOption(options)).toBe(options);
    });

    it('prepends the default option in the always mode', () => {
      expect(applyDefaultOption(options, fallback, 'always').map((o) => o.value)).toEqual(['none', 'a', 'b']);
    });

    it('defaults to the always mode', () => {
      expect(applyDefaultOption(options, fallback).map((o) => o.value)).toEqual(['none', 'a', 'b']);
    });

    it('keeps the default option first even when a sortFn would order it elsewhere', () => {
      const sorted = combineFieldOptions([option('b')], [option('a')], byValue);

      expect(applyDefaultOption(sorted, fallback, 'always').map((o) => o.value)).toEqual(['none', 'a', 'b']);
    });

    it('omits the default option in the fallback mode while there are options', () => {
      expect(applyDefaultOption(options, fallback, 'fallback')).toBe(options);
    });

    it('renders the default option in the fallback mode once the list is empty', () => {
      expect(applyDefaultOption([], fallback, 'fallback').map((o) => o.value)).toEqual(['none']);
    });
  });

  describe('getNextAvailableOptionIndex', () => {
    it('skips disabled and readonly options and wraps around', () => {
      const options = [option('a'), option('b', { disabled: true }), option('c', { readonly: true }), option('d')];

      expect(getNextAvailableOptionIndex(0, options, 'down')).toBe(3);
      expect(getNextAvailableOptionIndex(3, options, 'down')).toBe(0);
      expect(getNextAvailableOptionIndex(0, options, 'up')).toBe(3);
    });

    it('returns -1 when nothing is selectable', () => {
      expect(getNextAvailableOptionIndex(-1, [], 'down')).toBe(-1);
      expect(getNextAvailableOptionIndex(-1, [option('a', { disabled: true })], 'down')).toBe(-1);
    });
  });
});
