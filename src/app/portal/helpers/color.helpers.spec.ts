import { contrastRatio, flatten, formatRatio, isGradient, parseRgb, toHex } from './color.helpers';

describe('color helpers', () => {
  describe('parseRgb', () => {
    it('reads a long hex', () => {
      expect(parseRgb('#4f46e5')).toEqual({ r: 79, g: 70, b: 229, a: 1 });
    });

    it('reads a short hex', () => {
      expect(parseRgb('#abc')).toEqual({ r: 170, g: 187, b: 204, a: 1 });
    });

    it('reads an eight-digit hex as alpha', () => {
      expect(parseRgb('#00000080')?.a).toBeCloseTo(0.502, 2);
    });

    it('reads the legacy comma form', () => {
      expect(parseRgb('rgba(255, 0, 0, 0.5)')).toEqual({ r: 255, g: 0, b: 0, a: 0.5 });
    });

    it('reads the modern slash form', () => {
      expect(parseRgb('rgb(255 255 255 / 6%)')).toEqual({ r: 255, g: 255, b: 255, a: 0.06 });
    });

    it('returns null for anything the browser still has to resolve', () => {
      expect(parseRgb('color-mix(in srgb, red 50%, transparent)')).toBeNull();
      expect(parseRgb('rebeccapurple')).toBeNull();
    });
  });

  describe('contrastRatio', () => {
    const white = { r: 255, g: 255, b: 255, a: 1 };
    const black = { r: 0, g: 0, b: 0, a: 1 };

    it('is 21 for black on white', () => {
      expect(contrastRatio(black, white)).toBeCloseTo(21, 5);
    });

    it('is 1 for a colour on itself', () => {
      expect(contrastRatio(white, white)).toBeCloseTo(1, 5);
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
  });

  describe('flatten', () => {
    it('leaves an opaque colour alone', () => {
      const opaque = { r: 1, g: 2, b: 3, a: 1 };

      expect(flatten(opaque, { r: 9, g: 9, b: 9, a: 1 })).toBe(opaque);
    });
  });

  describe('formatRatio', () => {
    it('truncates rather than rounds, so a near miss never reads as a pass', () => {
      expect(formatRatio(4.4999)).toBe('4.49');
      expect(formatRatio(4.5)).toBe('4.50');
    });
  });

  describe('toHex', () => {
    it('clamps and pads', () => {
      expect(toHex({ r: -5, g: 7, b: 300, a: 1 })).toBe('#0007ff');
    });
  });

  describe('isGradient', () => {
    it('catches the fill that would invalidate every derived colour', () => {
      expect(isGradient('linear-gradient(#fff, #000)')).toBe(true);
      expect(isGradient('#ffffff')).toBe(false);
    });
  });
});
