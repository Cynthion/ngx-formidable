import fc from 'fast-check';
import { PortalFilterStrategy, PortalOptionSpec } from '../model/field-spec.model';
import { filterOptions } from './fuzzy.helpers';

const OPTIONS: readonly PortalOptionSpec[] = [
  { value: 'lighthouse', label: 'Pharos Lighthouse', subtitle: 'Alexandria' },
  { value: 'library', label: 'Library of Alexandria', subtitle: 'Scrolls' },
  { value: 'colossus', label: 'Colossus of Rhodes', subtitle: 'Bronze' }
];

/** Text from a small alphabet, both cases, so a filter drawn from it often matches. */
const text = (minLength: number, maxLength: number) =>
  fc.string({ unit: fc.constantFrom('a', 'b', 'A', 'B', ' '), minLength, maxLength });

/** Any option list, each option with a label and a subtitle. */
const OPTION_LISTS = fc
  .array(fc.record({ label: text(1, 10), subtitle: text(1, 10) }), { maxLength: 8 })
  .map((entries) => entries.map((entry, index): PortalOptionSpec => ({ value: `o${index}`, ...entry })));

/** Any filter that is not blank. */
const FILTERS = text(1, 4).filter((filter) => filter.trim() !== '');

const STRATEGIES = fc.constantFrom<PortalFilterStrategy>('fuzzy', 'contains', 'starts-with');

const values = (matches: ReturnType<typeof filterOptions>) => matches.map((match) => match.option.value);

describe('filterOptions', () => {
  it('matches on the label', () => {
    expect(values(filterOptions(OPTIONS, 'colossus'))).toEqual(['colossus']);
  });

  it('matches on the subtitle too', () => {
    expect(values(filterOptions(OPTIONS, 'bronze'))).toContain('colossus');
  });

  it('returns nothing for a filter that matches nothing', () => {
    expect(filterOptions(OPTIONS, 'zzzzzz')).toEqual([]);
  });

  // The three strategies are what makes the division visible: the field emits the same filter text either
  // way, and only the consumer's matching decides whether a typo finds anything.
  it('forgives a typo under fuzzy and not under the literal strategies', () => {
    const typo = 'colosus';

    expect(values(filterOptions(OPTIONS, typo, 'fuzzy'))).toEqual(['colossus']);
    expect(filterOptions(OPTIONS, typo, 'contains')).toEqual([]);
    expect(filterOptions(OPTIONS, typo, 'starts-with')).toEqual([]);
  });

  it('returns the whole list, in order and unhighlighted, for a blank filter', () => {
    const blank = fc.string({ unit: fc.constantFrom(' ', '\t', '\n'), maxLength: 3 });

    fc.assert(
      fc.property(OPTION_LISTS, blank, STRATEGIES, (options, filter, strategy) => {
        expect(filterOptions(options, filter, strategy)).toEqual(
          options.map((option) => ({ option, highlights: { labelEntries: [], subtitleEntries: [] } }))
        );
      })
    );
  });

  it('returns only options from the list, each once', () => {
    fc.assert(
      fc.property(OPTION_LISTS, FILTERS, STRATEGIES, (options, filter, strategy) => {
        const found = filterOptions(options, filter, strategy).map((match) => match.option);

        expect(new Set(found).size).toBe(found.length);
        for (const option of found) expect(options).toContain(option);
      })
    );
  });

  it('splits a matched label and subtitle into runs that rebuild them', () => {
    fc.assert(
      fc.property(OPTION_LISTS, FILTERS, STRATEGIES, (options, filter, strategy) => {
        for (const { option, highlights } of filterOptions(options, filter, strategy)) {
          const rebuilt = (entries: readonly { text: string }[]) => entries.map((entry) => entry.text).join('');

          if (highlights.labelEntries.length) expect(rebuilt(highlights.labelEntries)).toBe(option.label);
          if (highlights.subtitleEntries.length) expect(rebuilt(highlights.subtitleEntries)).toBe(option.subtitle);
        }
      })
    );
  });

  it('finds under contains every label holding the filter, in order, and marks where', () => {
    fc.assert(
      fc.property(OPTION_LISTS, FILTERS, (options, filter) => {
        const needle = filter.trim().toLowerCase();
        const found = filterOptions(options, filter, 'contains');

        expect(values(found)).toEqual(
          options.filter((option) => option.label.toLowerCase().includes(needle)).map((option) => option.value)
        );
        for (const { highlights } of found) {
          const marked = highlights.labelEntries.filter((entry) => entry.isHighlighted);

          expect(marked.map((entry) => entry.text.toLowerCase())).toEqual([needle]);
        }
      })
    );
  });

  it('finds under starts-with every label opening with the filter, in order', () => {
    fc.assert(
      fc.property(OPTION_LISTS, FILTERS, (options, filter) => {
        const needle = filter.trim().toLowerCase();

        expect(values(filterOptions(options, filter, 'starts-with'))).toEqual(
          options.filter((option) => option.label.toLowerCase().startsWith(needle)).map((option) => option.value)
        );
      })
    );
  });
});
