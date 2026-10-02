import { format } from 'date-fns';
import fc from 'fast-check';
import { DATE_FORMATS, DATES, TIME_FORMATS } from '../testing/arbitraries';
import {
  findSegmentAtCaret,
  formatToTokenMask,
  parseUnicodeDateTime,
  stepDateTimeUnit,
  UNICODE_DATE_TOKENS,
  UNICODE_TIME_TOKENS,
  validateUnicodeTokenFormat
} from './format.helpers';
import { DEFAULT_PATTERNS } from './mask.helpers';

/**
 * What a date or time field relies on from its `unicodeTokenFormat`: that every value it shows can be typed
 * into its mask, that what it shows parses back, that a half-typed value never parses, and that an arrow key
 * steps the part under the caret. The properties run over every format a field accepts, built from its
 * tokens in any order and with any separators or none, and over any date the mask's four year slots hold.
 */

const ANY_FORMAT = fc.oneof(DATE_FORMATS, TIME_FORMATS);

/** Tokens date-fns knows that a mask cannot type: unpadded, variable-width or not a date part at all. */
const UNSUPPORTED = ['y', 'yyy', 'M', 'MMMM', 'd', 'do', 'E', 'EEEE', 'Q', 'w', 'H', 'h', 'm', 's', 'S', 'X'];

const isSlot = (character: string) => character in DEFAULT_PATTERNS;

/** Whether `text` is something the mask accepts: one character per slot, each one its slot allows. */
function fits(text: string, mask: string): boolean {
  return (
    text.length === mask.length &&
    [...mask].every((slot, index) => DEFAULT_PATTERNS[slot]?.pattern.test(text[index]!) ?? slot === text[index])
  );
}

describe('format.helpers', () => {
  // `parseUnicodeDateTime` takes the parts a format leaves out from today. One ordinary day keeps what the
  // properties generate independent of the day they run on; why that matters is in `impl/backlog.md`.
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2024, 5, 15, 12));
  });

  afterEach(() => void vi.useRealTimers());

  describe('validateUnicodeTokenFormat', () => {
    it('accepts every format built from a field’s own tokens, with or without separators', () => {
      fc.assert(fc.property(DATE_FORMATS, (unicode) => validateUnicodeTokenFormat(unicode, UNICODE_DATE_TOKENS)));
      fc.assert(fc.property(TIME_FORMATS, (unicode) => validateUnicodeTokenFormat(unicode, UNICODE_TIME_TOKENS)));
    });

    it('rejects a format holding any token a mask cannot type', () => {
      fc.assert(
        fc.property(DATE_FORMATS, fc.constantFrom(...UNSUPPORTED), fc.nat(), (unicode, token, at) => {
          const index = at % (unicode.length + 1);

          return !validateUnicodeTokenFormat(
            `${unicode.slice(0, index)} ${token} ${unicode.slice(index)}`,
            UNICODE_DATE_TOKENS
          );
        })
      );
    });

    it('rejects the other field’s tokens', () => {
      expect(validateUnicodeTokenFormat('HH:mm', UNICODE_DATE_TOKENS)).toBe(false);
      expect(validateUnicodeTokenFormat('yyyy-MM-dd', UNICODE_TIME_TOKENS)).toBe(false);
    });

    it('rejects quoted text, which a mask cannot type', () => {
      expect(validateUnicodeTokenFormat("HH 'Uhr' mm", UNICODE_TIME_TOKENS)).toBe(false);
    });

    it('rejects a format with nothing to type', () => {
      expect(validateUnicodeTokenFormat('', UNICODE_DATE_TOKENS)).toBe(false);
      expect(validateUnicodeTokenFormat('--/--', UNICODE_DATE_TOKENS)).toBe(false);
    });
  });

  describe('formatToTokenMask', () => {
    it('masks every value a format shows, character by character', () => {
      fc.assert(
        fc.property(ANY_FORMAT, DATES, (unicode, date) => fits(format(date, unicode), formatToTokenMask(unicode)))
      );
    });
  });

  describe('parseUnicodeDateTime', () => {
    // A day is only a day within its month and year; a format leaving them to today is in `impl/backlog.md`.
    it('parses whatever a format shows back into the same text', () => {
      fc.assert(
        fc.property(ANY_FORMAT, DATES, (unicode, date) => {
          fc.pre(!unicode.includes('dd') || (unicode.includes('M') && unicode.includes('y')));

          const parsed = parseUnicodeDateTime(format(date, unicode), unicode);

          expect(parsed && format(parsed, unicode)).toBe(format(date, unicode));
        })
      );
    });

    it('parses a date naming its year, month and day back into that day', () => {
      fc.assert(
        fc.property(DATE_FORMATS, DATES, (unicode, date) => {
          fc.pre(unicode.includes('yyyy') && unicode.includes('M') && unicode.includes('dd'));

          const parsed = parseUnicodeDateTime(format(date, unicode), unicode)!;

          expect(format(parsed, 'yyyy-MM-dd')).toBe(format(date, 'yyyy-MM-dd'));
        })
      );
    });

    it('never parses a half-typed value', () => {
      fc.assert(
        fc.property(ANY_FORMAT, DATES, (unicode, date) => {
          const text = format(date, unicode);

          for (let length = 1; length < text.length; length++) {
            expect(parseUnicodeDateTime(text.slice(0, length), unicode)).toBeNull();
          }
        })
      );
    });

    it('reads surrounding whitespace as nothing', () => {
      expect(parseUnicodeDateTime(' 2024-05-12 ', 'yyyy-MM-dd')).toEqual(new Date(2024, 4, 12));
      expect(parseUnicodeDateTime('', 'yyyy-MM-dd')).toBeNull();
      expect(parseUnicodeDateTime('   ', 'yyyy-MM-dd')).toBeNull();
    });

    it('rejects a day or a time the calendar does not have', () => {
      expect(parseUnicodeDateTime('2024-02-30', 'yyyy-MM-dd')).toBeNull();
      expect(parseUnicodeDateTime('24:00', 'HH:mm')).toBeNull();
    });
  });

  describe('findSegmentAtCaret', () => {
    it('edits the part a caret stands in front of, and that part spans slots only', () => {
      fc.assert(
        fc.property(ANY_FORMAT, (unicode) => {
          const mask = formatToTokenMask(unicode);

          [...mask].forEach((slot, caret) => {
            if (!isSlot(slot)) return;

            const segment = findSegmentAtCaret(unicode, caret)!;

            expect(caret).toBeGreaterThanOrEqual(segment.start);
            expect(caret).toBeLessThan(segment.end);
            expect([...mask.slice(segment.start, segment.end)].every(isSlot)).toBe(true);
          });
        })
      );
    });

    // Where the last keystroke went: a caret at a part's end, or parked in a separator, keeps editing it.
    it('keeps a caret behind a part on that part', () => {
      expect(findSegmentAtCaret('dd . MM . yyyy', 2)?.unit).toBe('day');
      expect(findSegmentAtCaret('dd . MM . yyyy', 3)?.unit).toBe('day');
      expect(findSegmentAtCaret('dd . MM . yyyy', 14)?.unit).toBe('year');
    });

    it('takes the first part for a caret before every part', () => {
      expect(findSegmentAtCaret('-dd.MM', 0)?.unit).toBe('day');
    });
  });

  describe('stepDateTimeUnit', () => {
    it('lands back on the same day after a step of a day or less and its reverse', () => {
      fc.assert(
        fc.property(
          DATES,
          fc.constantFrom('day' as const, 'hour' as const, 'minute' as const, 'second' as const, 'meridiem' as const),
          fc.constantFrom(1 as const, -1 as const),
          (date, unit, direction) => {
            const back = stepDateTimeUnit(stepDateTimeUnit(date, unit, direction), unit, direction === 1 ? -1 : 1);

            expect(format(back, 'yyyy-MM-dd')).toBe(format(date, 'yyyy-MM-dd'));
          }
        )
      );
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
