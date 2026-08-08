import {
  findSegmentAtCaret,
  formatToDateTokenMask,
  formatToTimeTokenMask,
  parseUnicodeDateTime,
  stepDateTimeUnit,
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

  describe('findSegmentAtCaret', () => {
    /** Compact assertion: which token the caret edits, and the range that gets selected. */
    function at(unicodeTokenFormat: string, caret: number): string {
      const segment = findSegmentAtCaret(unicodeTokenFormat, caret);

      return segment ? `${segment.token}:${segment.start}-${segment.end}:${segment.unit}` : 'none';
    }

    it('maps every caret of a spaced format onto its segment', () => {
      // '12 . 05 . 2024' — dd 0-2, MM 5-7, yyyy 10-14
      const fmt = 'dd . MM . yyyy';

      expect(at(fmt, 0)).toBe('dd:0-2:day');
      expect(at(fmt, 1)).toBe('dd:0-2:day');
      expect(at(fmt, 2)).toBe('dd:0-2:day'); // caret at a segment's end stays in it
      expect(at(fmt, 3)).toBe('dd:0-2:day'); // parked in a separator: the segment to the left
      expect(at(fmt, 5)).toBe('MM:5-7:month');
      expect(at(fmt, 7)).toBe('MM:5-7:month');
      expect(at(fmt, 10)).toBe('yyyy:10-14:year');
      expect(at(fmt, 14)).toBe('yyyy:10-14:year');
    });

    it('follows the token order of the format, not a fixed one', () => {
      expect(at('yyyy-MM-dd', 0)).toBe('yyyy:0-4:year');
      expect(at('yyyy-MM-dd', 5)).toBe('MM:5-7:month');
      expect(at('yyyy-MM-dd', 8)).toBe('dd:8-10:day');
    });

    it('maps time formats, including a meridiem', () => {
      expect(at('HH : mm', 0)).toBe('HH:0-2:hour');
      expect(at('HH : mm', 5)).toBe('mm:5-7:minute');
      expect(at('HH:mm:ss', 6)).toBe('ss:6-8:second');
      expect(at('hh:mm a', 6)).toBe('a:6-8:meridiem'); // 'a' renders as a two-slot 'AA' mask
    });

    it('falls back to the first segment for a caret before any of them', () => {
      expect(at('-dd.MM', 0)).toBe('dd:1-3:day');
    });

    it('returns null for a format with nothing to step', () => {
      expect(findSegmentAtCaret('---', 0)).toBeNull();
    });
  });

  describe('stepDateTimeUnit', () => {
    const base = new Date(2024, 4, 12, 14, 30, 45);

    it('steps each unit in both directions', () => {
      expect(stepDateTimeUnit(base, 'year', 1)).toEqual(new Date(2025, 4, 12, 14, 30, 45));
      expect(stepDateTimeUnit(base, 'month', -1)).toEqual(new Date(2024, 3, 12, 14, 30, 45));
      expect(stepDateTimeUnit(base, 'day', 1)).toEqual(new Date(2024, 4, 13, 14, 30, 45));
      expect(stepDateTimeUnit(base, 'hour', -1)).toEqual(new Date(2024, 4, 12, 13, 30, 45));
      expect(stepDateTimeUnit(base, 'minute', 1)).toEqual(new Date(2024, 4, 12, 14, 31, 45));
      expect(stepDateTimeUnit(base, 'second', -1)).toEqual(new Date(2024, 4, 12, 14, 30, 44));
    });

    it('clamps a month step to the shorter month', () => {
      expect(stepDateTimeUnit(new Date(2024, 0, 31), 'month', 1)).toEqual(new Date(2024, 1, 29));
    });

    it('carries a step over the unit above it', () => {
      expect(stepDateTimeUnit(new Date(2024, 4, 12, 23, 59), 'minute', 1)).toEqual(new Date(2024, 4, 13, 0, 0));
    });

    it('flips the meridiem either way', () => {
      expect(stepDateTimeUnit(new Date(2024, 4, 12, 9), 'meridiem', 1)).toEqual(new Date(2024, 4, 12, 21));
      expect(stepDateTimeUnit(new Date(2024, 4, 12, 9), 'meridiem', -1)).toEqual(new Date(2024, 4, 11, 21));
    });
  });
});
