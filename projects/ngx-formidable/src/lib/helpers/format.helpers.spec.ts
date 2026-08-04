import {
  formatToDateTokenMask,
  formatToTimeTokenMask,
  parseUnicodeDateTime,
  validateUnicodeDateTokenFormat
} from './format.helpers';

describe('format.helpers', () => {
  describe('formatToDateTokenMask', () => {
    it('maps date tokens to ngx-mask digit patterns and keeps separators', () => {
      expect(formatToDateTokenMask('yyyy-MM-dd', '0')).toBe('0000-00-00');
      expect(formatToDateTokenMask('dd . MM . yyyy', '0')).toBe('00 . 00 . 0000');
    });
  });

  describe('formatToTimeTokenMask', () => {
    it('maps time tokens to ngx-mask digit patterns and keeps separators', () => {
      expect(formatToTimeTokenMask('HH:mm', '0')).toBe('00:00');
      expect(formatToTimeTokenMask('HH : mm', '0')).toBe('00 : 00');
    });
  });

  describe('validateUnicodeDateTokenFormat', () => {
    it('accepts valid date tokens and rejects time tokens', () => {
      expect(validateUnicodeDateTokenFormat('yyyy-MM-dd')).toBe(true);
      expect(validateUnicodeDateTokenFormat('HH:mm')).toBe(false);
    });
  });

  describe('parseUnicodeDateTime', () => {
    it('parses a complete, well-formed date', () => {
      const result = parseUnicodeDateTime('2020-02-02', 'yyyy-MM-dd');
      expect(result).toEqual(new Date(2020, 1, 2));
    });

    it('parses a complete date with a spaced separator format', () => {
      const result = parseUnicodeDateTime('02 . 02 . 2020', 'dd . MM . yyyy');
      expect(result).toEqual(new Date(2020, 1, 2));
    });

    it('parses a complete time', () => {
      const result = parseUnicodeDateTime('14:30', 'HH:mm');
      expect(result).not.toBeNull();
      expect(result!.getHours()).toBe(14);
      expect(result!.getMinutes()).toBe(30);
    });

    it('returns null for empty / whitespace input', () => {
      expect(parseUnicodeDateTime('', 'yyyy-MM-dd')).toBeNull();
      expect(parseUnicodeDateTime('   ', 'yyyy-MM-dd')).toBeNull();
    });

    it('returns null for separator-less digits (the 20200202 bug)', () => {
      expect(parseUnicodeDateTime('20200202', 'yyyy-MM-dd')).toBeNull();
    });

    it('returns null for a partial / broken date', () => {
      expect(parseUnicodeDateTime('2020-02-', 'yyyy-MM-dd')).toBeNull();
      expect(parseUnicodeDateTime('2020', 'yyyy-MM-dd')).toBeNull();
    });

    it('returns null for separator-only noise', () => {
      expect(parseUnicodeDateTime('----------', 'yyyy-MM-dd')).toBeNull();
    });
  });
});
