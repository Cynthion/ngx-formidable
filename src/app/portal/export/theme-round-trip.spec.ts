import { PageSurface } from '../model/presets';
import { COLOR_SCHEMES, GEOMETRY_SCHEMES } from '../model/schemes';
import { DEFAULT_EXPORT_OPTIONS, exportTheme, orderedVarNames, ThemeExportOptions } from './theme-export';
import { importTheme } from './theme-import';

const PAGE: PageSurface = { background: '#0b0e16', text: '#e8ecf5' };
const FONT = "system-ui, 'Segoe UI', sans-serif";

const THEME = { ...GEOMETRY_SCHEMES.soft, ...COLOR_SCHEMES.midnight };

function roundTrip(options: ThemeExportOptions) {
  return importTheme(exportTheme({ vars: THEME, fontFamily: FONT, page: PAGE }, options));
}

describe('theme export and import', () => {
  it('round-trips every variable, the family and the page surface', () => {
    const result = roundTrip(DEFAULT_EXPORT_OPTIONS);

    expect(result.vars).toEqual(THEME);
    expect(result.fontFamily).toBe(FONT);
    expect(result.page).toEqual({ background: PAGE.background, text: PAGE.text });
    expect(result.skipped).toEqual([]);
  });

  it('round-trips in the SCSS format, whose comments are line comments', () => {
    const scss = exportTheme(
      { vars: THEME, fontFamily: FONT, page: PAGE },
      { ...DEFAULT_EXPORT_OPTIONS, format: 'scss' }
    );

    expect(scss).toContain('// ');
    expect(scss).not.toContain('/*');
    expect(importTheme(scss).vars).toEqual(THEME);
  });

  it('round-trips without comments', () => {
    const result = roundTrip({ ...DEFAULT_EXPORT_OPTIONS, includeComments: false });

    expect(result.vars).toEqual(THEME);
    expect(result.skipped).toEqual([]);
  });

  it('omits the page surface when asked to', () => {
    const css = exportTheme(
      { vars: THEME, fontFamily: null, page: PAGE },
      { ...DEFAULT_EXPORT_OPTIONS, includePageSurface: false }
    );

    expect(css).not.toContain('body {');
    expect(importTheme(css).page).toEqual({});
  });

  it('emits the variables in manifest order, not insertion order', () => {
    const shuffled = { '--formidable-color-field-text': '#000000', '--formidable-field-height': '48px' };

    expect(orderedVarNames(shuffled)).toEqual(['--formidable-field-height', '--formidable-color-field-text']);
  });

  it('carries a `color-mix()` value through unchanged', () => {
    const vars = {
      '--formidable-color-field-focus-box-shadow': GEOMETRY_SCHEMES.soft['--formidable-color-field-focus-box-shadow']!
    };
    const result = importTheme(exportTheme({ vars, fontFamily: null, page: PAGE }, DEFAULT_EXPORT_OPTIONS));

    expect(result.vars).toEqual(vars);
  });
});

describe('theme import', () => {
  it('reads a bare list of declarations with no selector around it', () => {
    const result = importTheme('--formidable-field-height: 48px;\n--formidable-border-radius: 2px;');

    expect(result.vars).toEqual({ '--formidable-field-height': '48px', '--formidable-border-radius': '2px' });
  });

  it('lists a variable outside the manifest rather than applying it', () => {
    const result = importTheme(':root { --formidable-not-a-thing: 1px; }');

    expect(result.vars).toEqual({});
    expect(result.skipped).toEqual([{ text: '--formidable-not-a-thing', reason: 'not-in-the-manifest' }]);
  });

  it('refuses a variable the library writes itself', () => {
    const result = importTheme(':root { --formidable-field-prefix-inset: 10px; }');

    expect(result.vars).toEqual({});
    expect(result.skipped[0]?.reason).toBe('written-by-the-library');
  });

  it('lists a foreign custom property', () => {
    const result = importTheme(':root { --my-brand: red; }');

    expect(result.skipped).toEqual([{ text: '--my-brand: red', reason: 'not-a-formidable-variable' }]);
  });

  it('reads the page surface only out of a page block', () => {
    const result = importTheme(':root { color: red; }\nbody { background: #111111; color: #eeeeee; }');

    expect(result.page).toEqual({ background: '#111111', text: '#eeeeee' });
    expect(result.skipped).toEqual([{ text: 'color: red', reason: 'unrecognised-declaration' }]);
  });

  it('accepts `background-color` as the page fill', () => {
    expect(importTheme('body { background-color: #222222; }').page).toEqual({ background: '#222222' });
  });
});
