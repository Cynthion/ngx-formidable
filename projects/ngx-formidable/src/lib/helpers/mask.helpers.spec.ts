import {
  analyzeMaskDisplayLength,
  DEFAULT_PATTERNS,
  DEFAULT_PLACEHOLDER_CHARACTER,
  DEFAULT_SPECIAL_CHARACTERS,
  isPlaceholderAmbiguous,
  MaskConfigSubset
} from './mask.helpers';

/** The mask config the fields resolve, and the one combination of it they cannot work with. */
describe('mask helpers', () => {
  function config(overrides: Partial<MaskConfigSubset> = {}): Required<MaskConfigSubset> {
    return {
      validation: true,
      showMaskTyped: false,
      placeHolderCharacter: DEFAULT_PLACEHOLDER_CHARACTER,
      dropSpecialCharacters: true,
      specialCharacters: DEFAULT_SPECIAL_CHARACTERS,
      thousandSeparator: ' ',
      decimalMarker: '.',
      prefix: '',
      suffix: '',
      allowNegativeNumbers: false,
      leadZeroDateTime: false,
      patterns: DEFAULT_PATTERNS,
      clearIfNotMatch: false,
      ...overrides
    } as Required<MaskConfigSubset>;
  }

  describe('isPlaceholderAmbiguous', () => {
    it('is false for the defaults, which no token pattern accepts', () => {
      expect(isPlaceholderAmbiguous('000 000 00 00', config())).toBeFalse();
    });

    it('is true when a token pattern accepts the placeholder', () => {
      const patterns = { ...DEFAULT_PATTERNS, X: { pattern: /\w/ } };

      expect(isPlaceholderAmbiguous('XXXXXX', config({ patterns }))).toBeTrue();
    });

    it('is true when the mask draws the placeholder as a literal', () => {
      expect(isPlaceholderAmbiguous('000_000', config())).toBeTrue();
    });

    it('is true when the placeholder is one of the special characters', () => {
      expect(isPlaceholderAmbiguous('000.000', config({ placeHolderCharacter: '.' }))).toBeTrue();
    });

    // The way out of all three: a character the mask cannot produce.
    it('is false again once the placeholder is moved out of the way', () => {
      const patterns = { ...DEFAULT_PATTERNS, X: { pattern: /\w/ } };

      expect(isPlaceholderAmbiguous('XXXXXX', config({ patterns, placeHolderCharacter: '•' }))).toBeFalse();
    });

    it('is false for an empty placeholder, which switches the slots off', () => {
      expect(isPlaceholderAmbiguous('000_000', config({ placeHolderCharacter: '' }))).toBeFalse();
    });
  });

  describe('analyzeMaskDisplayLength', () => {
    it('counts literals and required tokens', () => {
      expect(analyzeMaskDisplayLength('000 000')).toEqual({ min: 7, max: 7, variable: false });
    });

    it('treats an optional token as a range', () => {
      expect(analyzeMaskDisplayLength('0009')).toEqual({ min: 3, max: 4, variable: true });
    });

    it('adds the prefix and the suffix', () => {
      expect(analyzeMaskDisplayLength('000', { prefix: 'CHF ', suffix: '.-' })).toEqual({
        min: 9,
        max: 9,
        variable: false
      });
    });

    it('reports an unbounded mask as variable', () => {
      expect(analyzeMaskDisplayLength('separator.2').variable).toBeTrue();
    });
  });
});
