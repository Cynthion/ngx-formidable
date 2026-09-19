import { PortalOptionSpec } from '../model/field-spec.model';
import { fuzzyFilter } from './fuzzy.helpers';

const OPTIONS: readonly PortalOptionSpec[] = [
  { value: 'lighthouse', label: 'Pharos Lighthouse', subtitle: 'Alexandria' },
  { value: 'library', label: 'Library of Alexandria', subtitle: 'Scrolls' },
  { value: 'colossus', label: 'Colossus of Rhodes', subtitle: 'Bronze' }
];

describe('fuzzyFilter', () => {
  it('returns the whole list, unhighlighted, for an empty filter', () => {
    const result = fuzzyFilter(OPTIONS, '   ');

    expect(result.length).toBe(OPTIONS.length);
    expect(result[0]?.highlights.labelEntries).toEqual([]);
  });

  it('matches on the label', () => {
    const result = fuzzyFilter(OPTIONS, 'colossus');

    expect(result.map((entry) => entry.option.value)).toEqual(['colossus']);
  });

  it('matches on the subtitle too', () => {
    const result = fuzzyFilter(OPTIONS, 'bronze');

    expect(result.map((entry) => entry.option.value)).toContain('colossus');
  });

  it('splits the matched label into runs that rebuild the original text', () => {
    const [first] = fuzzyFilter(OPTIONS, 'rhodes');
    const entries = first!.highlights.labelEntries;

    expect(entries.length).toBeGreaterThan(1);
    expect(entries.map((entry) => entry.text).join('')).toBe('Colossus of Rhodes');
    expect(entries.some((entry) => entry.isHighlighted)).toBe(true);
  });

  it('returns nothing for a filter that matches nothing', () => {
    expect(fuzzyFilter(OPTIONS, 'zzzzzz')).toEqual([]);
  });
});
