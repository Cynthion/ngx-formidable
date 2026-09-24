import { slugify } from './slug.helpers';

describe('slugify', () => {
  it('makes a heading into an id', () => {
    expect(slugify('Five Things That Will Catch You Out')).toBe('five-things-that-will-catch-you-out');
  });

  it('collapses a run of punctuation into one separator', () => {
    expect(slugify('Import & Export — Theme CSS')).toBe('import-export-theme-css');
  });

  it('carries no separator at either end', () => {
    expect(slugify('  The Journey  ')).toBe('the-journey');
  });

  it('answers empty for text with nothing to slug, which is what a caller falls back on', () => {
    expect(slugify('—')).toBe('');
  });
});
