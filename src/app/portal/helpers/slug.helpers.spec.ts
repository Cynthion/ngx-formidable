import fc from 'fast-check';
import { slugify } from './slug.helpers';

/** Any text a heading, a section title or a variable name holds: mostly ASCII, some of it beyond. */
const TEXT = fc.string({
  unit: fc.oneof(fc.string({ unit: 'grapheme-ascii', minLength: 1, maxLength: 1 }), fc.constantFrom('é', 'ß', '—', '’'))
});

describe('slugify', () => {
  it('makes a heading into an id', () => {
    expect(slugify('Five Things That Will Catch You Out')).toBe('five-things-that-will-catch-you-out');
  });

  it('answers empty for text with nothing to slug, which is what a caller falls back on', () => {
    expect(slugify('—')).toBe('');
  });

  it('separates runs of letters and digits by one hyphen, and carries none at either end', () => {
    fc.assert(
      fc.property(TEXT, (text) => {
        expect(slugify(text)).toMatch(/^([a-z0-9]+(-[a-z0-9]+)*)?$/);
      })
    );
  });

  it('keeps every letter and digit, in order', () => {
    fc.assert(
      fc.property(TEXT, (text) => {
        expect(slugify(text).replaceAll('-', '')).toBe(text.toLowerCase().replace(/[^a-z0-9]/g, ''));
      })
    );
  });
});
