import fc from 'fast-check';
import { contrastRatio, flatten, formatRatio, isGradient, parseRgb, Rgb, toHex } from './color.helpers';

const CHANNEL = fc.integer({ min: 0, max: 255 });
const ALPHA = fc.double({ min: 0, max: 1, noNaN: true });

/** Any opaque colour a colour well can produce. */
const OPAQUE: fc.Arbitrary<Rgb> = fc.record({ r: CHANNEL, g: CHANNEL, b: CHANNEL, a: fc.constant(1) });
/** Any colour with any alpha. */
const COLOUR: fc.Arbitrary<Rgb> = fc.record({ r: CHANNEL, g: CHANNEL, b: CHANNEL, a: ALPHA });

describe('color helpers', () => {
  describe('parseRgb', () => {
    it('reads a short hex', () => {
      expect(parseRgb('#abc')).toEqual({ r: 170, g: 187, b: 204, a: 1 });
    });

    it('reads an eight-digit hex as alpha', () => {
      expect(parseRgb('#00000080')?.a).toBeCloseTo(0.502, 2);
    });

    it('reads the modern slash form, alpha as a percentage', () => {
      expect(parseRgb('rgb(255 255 255 / 6%)')).toEqual({ r: 255, g: 255, b: 255, a: 0.06 });
    });

    it('returns null for anything the browser still has to resolve', () => {
      expect(parseRgb('color-mix(in srgb, red 50%, transparent)')).toBeNull();
      expect(parseRgb('rebeccapurple')).toBeNull();
    });

    it('reads back the hex a colour well is given', () => {
      fc.assert(
        fc.property(OPAQUE, (colour) => {
          expect(parseRgb(toHex(colour))).toEqual(colour);
        })
      );
    });

    it('reads the legacy comma form and the modern slash form alike', () => {
      fc.assert(
        fc.property(COLOUR, ({ r, g, b, a }) => {
          expect(parseRgb(`rgba(${r}, ${g}, ${b}, ${a})`)).toEqual({ r, g, b, a });
          expect(parseRgb(`rgb(${r} ${g} ${b} / ${a})`)).toEqual({ r, g, b, a });
        })
      );
    });
  });

  describe('contrastRatio', () => {
    const white = { r: 255, g: 255, b: 255, a: 1 };
    const black = { r: 0, g: 0, b: 0, a: 1 };

    it('is 21 for black on white', () => {
      expect(contrastRatio(black, white)).toBeCloseTo(21, 5);
    });

    it('composites a translucent foreground over the background first', () => {
      const halfBlack = { r: 0, g: 0, b: 0, a: 0.5 };

      expect(contrastRatio(halfBlack, white)).toBeLessThan(contrastRatio(black, white));
    });

    it('reproduces the documented default-theme margins', () => {
      // The shipped slate palette: text and placeholder against the field fill.
      const fill = parseRgb('#f8fafc')!;

      expect(contrastRatio(parseRgb('#1e293b')!, fill)).toBeGreaterThan(4.5);
      expect(contrastRatio(parseRgb('#5a6b82')!, fill)).toBeGreaterThan(4.5);
      expect(contrastRatio(parseRgb('#4f46e5')!, fill)).toBeGreaterThan(3);
    });

    it('runs from 1, for a colour on itself, to 21', () => {
      fc.assert(
        fc.property(COLOUR, OPAQUE, (foreground, background) => {
          const ratio = contrastRatio(foreground, background);

          expect(ratio).toBeGreaterThanOrEqual(1);
          expect(ratio).toBeLessThanOrEqual(21 + 1e-9);
          expect(contrastRatio(background, background)).toBe(1);
        })
      );
    });

    it('is the same either way round between two opaque colours', () => {
      fc.assert(
        fc.property(OPAQUE, OPAQUE, (one, other) => {
          expect(contrastRatio(one, other)).toBeCloseTo(contrastRatio(other, one), 9);
        })
      );
    });
  });

  describe('flatten', () => {
    it('leaves an opaque colour alone', () => {
      fc.assert(
        fc.property(OPAQUE, OPAQUE, (foreground, background) => {
          expect(flatten(foreground, background)).toEqual(foreground);
        })
      );
    });

    it('makes a translucent colour opaque', () => {
      fc.assert(
        fc.property(COLOUR, OPAQUE, (foreground, background) => {
          expect(flatten(foreground, background).a).toBe(1);
        })
      );
    });

    it('shows the background through a transparent colour', () => {
      fc.assert(
        fc.property(COLOUR, OPAQUE, (foreground, background) => {
          expect(flatten({ ...foreground, a: 0 }, background)).toEqual(background);
        })
      );
    });
  });

  describe('formatRatio', () => {
    it('truncates rather than rounds, so a near miss never reads as a pass', () => {
      expect(formatRatio(4.4999)).toBe('4.49');
      expect(formatRatio(4.5)).toBe('4.50');
    });

    it('never states more than the ratio, to two decimals', () => {
      fc.assert(
        fc.property(fc.double({ min: 1, max: 21, noNaN: true }), (ratio) => {
          const stated = formatRatio(ratio);

          expect(stated).toMatch(/^\d{1,2}\.\d\d$/);
          expect(Number(stated)).toBeLessThanOrEqual(ratio);
        })
      );
    });
  });

  describe('toHex', () => {
    it('clamps each channel to its own end', () => {
      expect(toHex({ r: -5, g: 7, b: 300, a: 1 })).toBe('#0007ff');
    });

    it('clamps and pads whatever a colour well produced into #rrggbb', () => {
      const anyChannel = fc.double({ noNaN: true });

      fc.assert(
        fc.property(anyChannel, anyChannel, anyChannel, (r, g, b) => {
          expect(toHex({ r, g, b, a: 1 })).toMatch(/^#[0-9a-f]{6}$/);
        })
      );
    });
  });

  describe('isGradient', () => {
    it('catches the fill that would invalidate every derived colour', () => {
      expect(isGradient('linear-gradient(#fff, #000)')).toBe(true);
      expect(isGradient('#ffffff')).toBe(false);
    });
  });
});
