import fc from 'fast-check';
import {
  analyzeMaskDisplayLength,
  DEFAULT_PATTERNS,
  DEFAULT_PLACEHOLDER_CHARACTER,
  DEFAULT_SPECIAL_CHARACTERS,
  isPlaceholderAmbiguous,
  MaskConfigSubset
} from './mask.helpers';

/**
 * The mask config the fields resolve, and the one combination of it they cannot work with. The properties run
 * over any mask of the built-in tokens and the literals ngx-mask knows.
 */

const MASKS = fc
  .array(fc.constantFrom(...Object.keys(DEFAULT_PATTERNS), ...DEFAULT_SPECIAL_CHARACTERS), { minLength: 1 })
  .map((characters) => characters.join(''));

/** The optional tokens of a mask, which it may show or leave out. */
const optionals = (mask: string) => [...mask].filter((character) => DEFAULT_PATTERNS[character]?.optional).length;

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
    // `user/fields.md`: the default `_` is safe for every built-in pattern.
    it('never takes the default placeholder for content', () => {
      fc.assert(fc.property(MASKS, (mask) => !isPlaceholderAmbiguous(mask, config())));
    });

    it('takes any placeholder the mask draws as a literal for content', () => {
      fc.assert(
        fc.property(MASKS, fc.string({ minLength: 1, maxLength: 1 }), fc.nat(), (mask, placeholder, at) => {
          const index = at % (mask.length + 1);
          const drawing = mask.slice(0, index) + placeholder + mask.slice(index);

          return isPlaceholderAmbiguous(drawing, config({ placeHolderCharacter: placeholder }));
        })
      );
    });

    it('is true when a token pattern accepts the placeholder', () => {
      const patterns = { ...DEFAULT_PATTERNS, X: { pattern: /\w/ } };

      expect(isPlaceholderAmbiguous('XXXXXX', config({ patterns }))).toBe(true);
    });

    it('is true when the placeholder is one of the special characters', () => {
      expect(isPlaceholderAmbiguous('000.000', config({ placeHolderCharacter: '.' }))).toBe(true);
    });

    // The way out of all three: a character the mask cannot produce.
    it('is false again once the placeholder is moved out of the way', () => {
      const patterns = { ...DEFAULT_PATTERNS, X: { pattern: /\w/ } };

      expect(isPlaceholderAmbiguous('XXXXXX', config({ patterns, placeHolderCharacter: '•' }))).toBe(false);
    });

    it('is false for an empty placeholder, which switches the slots off', () => {
      expect(isPlaceholderAmbiguous('000_000', config({ placeHolderCharacter: '' }))).toBe(false);
    });
  });

  describe('analyzeMaskDisplayLength', () => {
    // It trims a mask, which ngx-mask does not, so one opening or closing on a space is left to `impl/backlog.md`.
    const UNTRIMMED = MASKS.filter((mask) => mask === mask.trim());

    it('shows a mask as long as it is written, or that less its optional tokens', () => {
      fc.assert(
        fc.property(UNTRIMMED, (mask) => {
          expect(analyzeMaskDisplayLength(mask)).toEqual({
            min: mask.length - optionals(mask),
            max: mask.length,
            variable: optionals(mask) > 0
          });
        })
      );
    });

    it('counts a repeat as its token written out', () => {
      fc.assert(
        fc.property(
          UNTRIMMED,
          fc.constantFrom(...Object.keys(DEFAULT_PATTERNS)),
          fc.integer({ min: 1, max: 12 }),
          (mask, token, times) => {
            expect(analyzeMaskDisplayLength(`${mask}${token}{${times}}`)).toEqual(
              analyzeMaskDisplayLength(mask + token.repeat(times))
            );
          }
        )
      );
    });

    it('spans alternatives from the shortest to the longest', () => {
      fc.assert(
        fc.property(UNTRIMMED, UNTRIMMED, (first, second) => {
          const [one, other] = [analyzeMaskDisplayLength(first), analyzeMaskDisplayLength(second)];

          expect(analyzeMaskDisplayLength(`${first}||${second}`)).toEqual({
            min: Math.min(one.min, other.min),
            max: Math.max(one.max, other.max),
            variable: true
          });
        })
      );
    });

    it('adds a prefix and a suffix to both bounds', () => {
      fc.assert(
        fc.property(UNTRIMMED, fc.string(), fc.string(), (mask, prefix, suffix) => {
          const bare = analyzeMaskDisplayLength(mask);

          expect(analyzeMaskDisplayLength(mask, { prefix, suffix })).toEqual({
            min: bare.min + prefix.length + suffix.length,
            max: bare.max + prefix.length + suffix.length,
            variable: bare.variable
          });
        })
      );
    });

    it('reports an unbounded mask as variable', () => {
      expect(analyzeMaskDisplayLength('separator.2').variable).toBe(true);
    });
  });
});
