import fc from 'fast-check';
import { FormidableOption } from '../models/formidable.model';
import { applyDefaultOption, combineFieldOptions, getNextAvailableOptionIndex } from './option.helpers';

const option = (value: string, extra: Partial<FormidableOption> = {}): FormidableOption => ({
  value,
  label: value.toUpperCase(),
  ...extra
});

const byValue = (a: FormidableOption, b: FormidableOption) => a.value.localeCompare(b.value);

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
    /** Up to a dozen options, any of which may be disabled or readonly. */
    const optionLists = fc
      .array(fc.record({ disabled: fc.boolean(), readonly: fc.boolean() }), { maxLength: 12 })
      .map((states) => states.map((state, index) => option(`o${index}`, state)));

    const canHighlight = (o: FormidableOption) => !o.disabled && !o.readonly;
    const highlightable = (options: FormidableOption[]) =>
      options.flatMap((o, index) => (canHighlight(o) ? [index] : []));

    /** Where the highlight lands on each of `steps` presses in `direction`, starting from nothing highlighted. */
    function walk(options: FormidableOption[], direction: 'up' | 'down', steps: number): number[] {
      const landed: number[] = [];
      let index = -1;

      for (let step = 0; step < steps; step++) {
        index = getNextAvailableOptionIndex(index, options, direction);
        landed.push(index);
      }

      return landed;
    }

    it('lands on an option that can take the highlight, or on none when no option can', () => {
      fc.assert(
        fc.property(
          optionLists,
          fc.integer({ min: -1, max: 12 }),
          fc.constantFrom('up' as const, 'down' as const),
          (options, current, direction) => {
            const next = getNextAvailableOptionIndex(current, options, direction);

            if (highlightable(options).length) expect(canHighlight(options[next]!)).toBe(true);
            else expect(next).toBe(-1);
          }
        )
      );
    });

    it('walks down through every option it can highlight, in order, and wraps to the first', () => {
      fc.assert(
        fc.property(optionLists, (options) => {
          const lap = highlightable(options);

          expect(walk(options, 'down', lap.length * 2)).toEqual([...lap, ...lap]);
        })
      );
    });

    it('walks up through the same options in reverse, starting from the last', () => {
      fc.assert(
        fc.property(optionLists, (options) => {
          const lap = highlightable(options).reverse();

          expect(walk(options, 'up', lap.length * 2)).toEqual([...lap, ...lap]);
        })
      );
    });
  });
});
