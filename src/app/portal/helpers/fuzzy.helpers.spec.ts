import { PortalOptionSpec } from '../model/field-spec.model';
import { filterOptions } from './fuzzy.helpers';

const OPTIONS: readonly PortalOptionSpec[] = [
  { value: 'lighthouse', label: 'Pharos Lighthouse', subtitle: 'Alexandria' },
  { value: 'library', label: 'Library of Alexandria', subtitle: 'Scrolls' },
  { value: 'colossus', label: 'Colossus of Rhodes', subtitle: 'Bronze' }
];

describe('filterOptions', () => {
  it('returns the whole list, unhighlighted, for an empty filter', () => {
    const result = filterOptions(OPTIONS, '   ');

    expect(result.length).toBe(OPTIONS.length);
    expect(result[0]?.highlights.labelEntries).toEqual([]);
  });

  it('matches on the label', () => {
    const result = filterOptions(OPTIONS, 'colossus');

    expect(result.map((entry) => entry.option.value)).toEqual(['colossus']);
  });

  it('matches on the subtitle too', () => {
    const result = filterOptions(OPTIONS, 'bronze');

    expect(result.map((entry) => entry.option.value)).toContain('colossus');
  });

  it('splits the matched label into runs that rebuild the original text', () => {
    const [first] = filterOptions(OPTIONS, 'rhodes');
    const entries = first!.highlights.labelEntries;

    expect(entries.length).toBeGreaterThan(1);
    expect(entries.map((entry) => entry.text).join('')).toBe('Colossus of Rhodes');
    expect(entries.some((entry) => entry.isHighlighted)).toBe(true);
  });

  it('returns nothing for a filter that matches nothing', () => {
    expect(filterOptions(OPTIONS, 'zzzzzz')).toEqual([]);
  });

  // The three strategies are what makes the division visible: the field emits the same filter text either
  // way, and only the consumer's matching decides whether a typo finds anything.
  it('forgives a typo under fuzzy and not under the literal strategies', () => {
    const typo = 'colosus';

    expect(filterOptions(OPTIONS, typo, 'fuzzy').map((entry) => entry.option.value)).toEqual(['colossus']);
    expect(filterOptions(OPTIONS, typo, 'contains')).toEqual([]);
    expect(filterOptions(OPTIONS, typo, 'starts-with')).toEqual([]);
  });

  it('matches mid-label under contains but not under starts-with', () => {
    expect(filterOptions(OPTIONS, 'alexandria', 'contains').map((entry) => entry.option.value)).toEqual(['library']);
    expect(filterOptions(OPTIONS, 'alexandria', 'starts-with')).toEqual([]);
    expect(filterOptions(OPTIONS, 'pharos', 'starts-with').map((entry) => entry.option.value)).toEqual(['lighthouse']);
  });

  // Only the label, which is the difference from fuzzy: `lighthouse` carries Alexandria as its subtitle and
  // a literal strategy does not reach it.
  it('reads only the label under a literal strategy', () => {
    expect(filterOptions(OPTIONS, 'bronze', 'contains')).toEqual([]);
    expect(filterOptions(OPTIONS, 'bronze', 'fuzzy').map((entry) => entry.option.value)).toEqual(['colossus']);
  });

  it('marks the matched run under a literal strategy too', () => {
    const [first] = filterOptions(OPTIONS, 'rhodes', 'contains');
    const entries = first!.highlights.labelEntries;

    expect(entries.map((entry) => entry.text).join('')).toBe('Colossus of Rhodes');
    expect(entries.filter((entry) => entry.isHighlighted).map((entry) => entry.text)).toEqual(['Rhodes']);
  });
});
