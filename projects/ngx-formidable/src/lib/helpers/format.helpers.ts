import { addDays, addHours, addMinutes, addMonths, addSeconds, addYears, format, isValid, parse } from 'date-fns';

/** Both halves of the check a `Date` needs: that it is one, and that it is not `Invalid Date`. */
export function isValidDateObject(value: unknown): boolean {
  return value instanceof Date && isValid(value);
}

/**
 * Parses a masked date/time string against a Unicode format, strictly.
 *
 * date-fns `parse` fills tokens it cannot read from the reference date, so a
 * partial/empty/ambiguous string can yield a bogus date. To reject those, we
 * require the parsed date to round-trip back to the input, case aside. Returns
 * null unless the input is a complete, unambiguous match.
 *
 * What a format leaves out comes from 2000-01-01, so `dd.MM` takes 29 February,
 * and `yy` reads `00`–`49` as 20xx and `50`–`99` as 19xx.
 */
export function parseUnicodeDateTime(input: string, unicodeTokenFormat: string): Date | null {
  const trimmed = input.trim();
  if (trimmed.length === 0) return null;

  // Not today: a leap year, a 31-day month, and no daylight-saving switch to shift a time into another hour.
  const parsed = parse(trimmed, unicodeTokenFormat, new Date(2000, 0, 1));
  if (!isValidDateObject(parsed)) return null;
  if (format(parsed, unicodeTokenFormat).toLowerCase() !== trimmed.toLowerCase()) return null;

  return parsed;
}

/**
 * Whether a Unicode format string is one a masked field can be typed into: at least one token, every token
 * one of `tokens` — `UNICODE_DATE_TOKENS` or `UNICODE_TIME_TOKENS` — no quoted text, which the mask cannot
 * type, and no meridiem right before a dot, which date-fns reads as part of it.
 */
export function validateUnicodeTokenFormat(format: string, tokens: readonly string[]): boolean {
  const formatTokens = tokenizeFormat(format).filter((token) => /^[a-zA-Z]+$/.test(token));

  return (
    !format.includes("'") &&
    !/a\./.test(format) &&
    formatTokens.length > 0 &&
    formatTokens.every((token) => tokens.includes(token))
  );
}

/**
 * Converts a valid Unicode date or time format string into an input mask: `dd/MM/yyyy` becomes `00/00/0000`.
 * Every token takes its own mask, and separators stay.
 */
export function formatToTokenMask(unicodeTokenFormat: string): string {
  return tokenizeFormat(unicodeTokenFormat)
    .map((token) => tokenMask(token) ?? token)
    .join('');
}

// #region Date

/** Used for date normalization. Normalizes the time part to 00:00:00:00. */
export function normalizeTimePart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

/**
 * The date-fns tokens a date format may use: the fixed-width ones, because the mask has one slot per
 * character. `d` would render `31` into a one-slot mask, and `MMMM` `September` into a four-slot one.
 */
export const UNICODE_DATE_TOKENS = ['yy', 'yyyy', 'MM', 'MMM', 'dd'] as const;

type DateToken = (typeof UNICODE_DATE_TOKENS)[number];

const DATE_TOKEN_MASK_MAP: Record<DateToken, string> = {
  yy: '00',
  yyyy: '0000',
  MM: '00',
  MMM: 'SSS',
  dd: '00'
};

function isDateToken(token: string): token is DateToken {
  return (UNICODE_DATE_TOKENS as readonly string[]).includes(token);
}

// #endregion

// #region Time

/** Used for time normalization. Normalizes the date part to 1970-01-01. */
export function normalizeDatePart(date: Date): Date {
  return new Date(1970, 0, 1, date.getHours(), date.getMinutes(), date.getSeconds(), date.getMilliseconds());
}

/** The date-fns tokens a time format may use: the fixed-width ones, as for `UNICODE_DATE_TOKENS`. */
export const UNICODE_TIME_TOKENS = [
  'HH', // Hours (24h)
  'hh', // Hours (12h)
  'mm', // Minutes
  'ss', // Seconds
  'a', // AM/PM
  'aa' // AM/PM
] as const;

type TimeToken = (typeof UNICODE_TIME_TOKENS)[number];

const TIME_TOKEN_MASK_MAP: Record<TimeToken, string> = {
  HH: '00',
  hh: '00',
  mm: '00',
  ss: '00',
  a: 'AA',
  aa: 'AA'
};

function isTimeToken(token: string): token is TimeToken {
  return (UNICODE_TIME_TOKENS as readonly string[]).includes(token);
}

// #endregion

// #region Segments

/** The part of a date/time an arrow key steps. */
export type DateTimeUnit = 'year' | 'month' | 'day' | 'hour' | 'minute' | 'second' | 'meridiem';

/** A steppable token of a format string, mapped onto the character range it occupies in the rendered value. */
export interface FormatSegment {
  token: string;
  start: number;
  /** Exclusive. */
  end: number;
  unit: DateTimeUnit;
}

/**
 * The segment a caret edits: the one it sits in, else the closest one starting before it.
 *
 * A caret at a segment's end, or parked in a separator, therefore keeps editing the segment to its
 * left — which is where the last keystroke was.
 */
export function findSegmentAtCaret(unicodeTokenFormat: string, caret: number): FormatSegment | null {
  const segments = getFormatSegments(unicodeTokenFormat);

  return segments.filter((segment) => segment.start <= caret).pop() ?? segments[0] ?? null;
}

/** Steps `date` by one `unit` in `direction`. Meridiem flips by 12 hours, either way. */
export function stepDateTimeUnit(date: Date, unit: DateTimeUnit, direction: 1 | -1): Date {
  switch (unit) {
    case 'year':
      return addYears(date, direction);
    case 'month':
      return addMonths(date, direction);
    case 'day':
      return addDays(date, direction);
    case 'hour':
      return addHours(date, direction);
    case 'minute':
      return addMinutes(date, direction);
    case 'second':
      return addSeconds(date, direction);
    case 'meridiem':
      return addHours(date, 12 * direction);
  }
}

/** `M` (month) and `m` (minute) differ by case, so date and time tokens share one map without colliding. */
const TOKEN_UNIT_MAP: Record<string, DateTimeUnit> = {
  yy: 'year',
  yyyy: 'year',
  MM: 'month',
  MMM: 'month',
  dd: 'day',
  HH: 'hour',
  hh: 'hour',
  mm: 'minute',
  ss: 'second',
  a: 'meridiem',
  aa: 'meridiem'
};

/**
 * The steppable segments of the rendered value, in render order. Separators are skipped but still
 * advance the offset — widths come from each part's *mask*, which is what the input shows.
 */
function getFormatSegments(unicodeTokenFormat: string): FormatSegment[] {
  const segments: FormatSegment[] = [];
  let offset = 0;

  for (const token of tokenizeFormat(unicodeTokenFormat)) {
    const start = offset;
    offset += renderedWidth(token);

    const unit = TOKEN_UNIT_MAP[token];
    if (unit) segments.push({ token, start, end: offset, unit });
  }

  return segments;
}

function renderedWidth(token: string): number {
  return (tokenMask(token) ?? token).length;
}

function tokenMask(token: string): string | null {
  if (isDateToken(token)) return DATE_TOKEN_MASK_MAP[token];
  if (isTimeToken(token)) return TIME_TOKEN_MASK_MAP[token];

  return null;
}

// #endregion

/**
 * Breaks a Unicode format string into an array of tokens and literal characters.
 * Groups consecutive alphabetic characters (e.g. 'yyyy') as single tokens.
 * Quoted text is treated as literal and preserved as-is (not tokenized).
 *
 * For example:
 *   tokenizeFormat("dd/MM/yyyy") => ['dd', '/', 'MM', '/', 'yyyy']
 *   tokenizeFormat("yyyy 'year' MM") => ['yyyy', ' ', 'year', ' ', 'MM']
 *   tokenizeFormat("HH:mm") => ['HH', ':', 'mm']
 */
function tokenizeFormat(format: string): string[] {
  const tokens: string[] = [];
  let buffer = '';
  let inQuote = false;
  for (const c of format) {
    if (c === "'") {
      inQuote = !inQuote;
      if (buffer) {
        tokens.push(buffer);
        buffer = '';
      }
      continue;
    }
    if (inQuote) {
      buffer += c;
      continue;
    }
    if (/[a-zA-Z]/.test(c)) {
      if (!buffer || buffer[0] === c) {
        buffer += c;
      } else {
        tokens.push(buffer);
        buffer = c;
      }
    } else {
      if (buffer) {
        tokens.push(buffer);
        buffer = '';
      }
      tokens.push(c);
    }
  }
  if (buffer) tokens.push(buffer);
  return tokens;
}
