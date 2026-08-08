import { addDays, addHours, addMinutes, addMonths, addSeconds, addYears, format, isValid, parse } from 'date-fns';

export function isValidDateObject(value: unknown): boolean {
  return value instanceof Date && isValid(value);
}

/**
 * Parses a masked date/time string against a Unicode format, strictly.
 *
 * date-fns `parse` fills tokens it cannot read from the reference date, so a
 * partial/empty/ambiguous string can yield a bogus (often "today") date. To
 * reject those, we require the parsed date to round-trip back to the exact
 * input. Returns null unless the input is a complete, unambiguous match.
 */
export function parseUnicodeDateTime(input: string, unicodeTokenFormat: string): Date | null {
  const trimmed = input.trim();
  if (trimmed.length === 0) return null;

  const parsed = parse(trimmed, unicodeTokenFormat, new Date());
  if (!isValidDateObject(parsed)) return null;
  if (format(parsed, unicodeTokenFormat) !== trimmed) return null;

  return parsed;
}

// #region Date

/** Used for date normalization. Normalizes the time part to 00:00:00:00. */
export function normalizeTimePart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

/**
 * Validates that all alphabetic tokens in a format string are valid
 * date-related tokens (years, months, days only).
 *
 * @param format - A Unicode date format string (e.g. 'yyyy-MM-dd')
 * @returns True if all extracted tokens are recognized date tokens; otherwise false.
 */
export function validateUnicodeDateTokenFormat(format: string): boolean {
  const tokens = extractTokens(format);
  return tokens.every(isDateToken);
}

/**
 * Converts a Unicode date format string into an input mask string.
 * Replaces known date tokens (e.g. 'dd', 'MM', 'yyyy') with their corresponding mask.
 * Unknown alphabetic tokens are replaced with repeated mask characters.
 * Non-alphabetic characters (e.g. separators) are preserved as-is.
 *
 * @param unicodeTokenFormat - The date format string to convert (e.g. 'dd/MM/yyyy')
 * @param maskChar - The character used to fill unknown token positions (e.g. '_')
 * @returns A mask string suitable for input masking (e.g. '00/00/0000')
 */
export function formatToDateTokenMask(unicodeTokenFormat: string, maskChar: string): string {
  const tokens = tokenizeFormat(unicodeTokenFormat);

  return tokens
    .map((token) => {
      if (isDateToken(token)) return DATE_TOKEN_MASK_MAP[token];

      if (/^[a-zA-Z]+$/.test(token)) {
        return maskChar.repeat(token.length);
      }

      return token;
    })
    .join('');
}

/** Unicode Date Tokens that are allowed to be used with date-fns. */
export const UNICODE_DATE_TOKENS = [
  // Calendar Years
  'y',
  'yy',
  'yyy',
  'yyyy',

  // Calendar Months
  'M',
  'MM',
  'MMM',
  'MMMM',

  // Day of Month
  'd',
  'dd'
] as const;

type DateToken = (typeof UNICODE_DATE_TOKENS)[number];

const DATE_TOKEN_MASK_MAP: Record<DateToken, string> = {
  // Calendar Years
  y: '0',
  yy: '00',
  yyy: '000',
  yyyy: '0000',

  // Calendar Months
  M: '0',
  MM: '00',
  MMM: 'SSS',
  MMMM: 'SSSS',

  // Day of Month
  d: '0',
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

/**
 * Validates that all alphabetic tokens in a format string are valid
 * time-related tokens (hours, minutes, seconds, etc.).
 *
 * @param format - A Unicode time format string (e.g. 'HH.mm')
 * @returns True if all extracted tokens are recognized time tokens; otherwise false.
 */
export function validateUnicodeTimeTokenFormat(format: string): boolean {
  const tokens = extractTokens(format);
  return tokens.every(isTimeToken);
}

/**
 * Converts a Unicode time format string into an input mask string.
 * Replaces known time tokens (e.g. 'HH', 'mm', 'ss') with their corresponding mask.
 * Unknown alphabetic tokens are replaced with repeated mask characters.
 * Non-alphabetic characters (e.g. separators) are preserved as-is.
 *
 * @param unicodeTokenFormat - The time format string to convert (e.g. 'HH:mm')
 * @param maskChar - The character used to fill unknown token positions (e.g. '_')
 * @returns A mask string suitable for input masking (e.g. '00:00')
 */
export function formatToTimeTokenMask(unicodeTokenFormat: string, maskChar: string): string {
  const tokens = tokenizeFormat(unicodeTokenFormat);

  return tokens
    .map((token) => {
      if (isTimeToken(token)) return TIME_TOKEN_MASK_MAP[token];

      if (/^[a-zA-Z]+$/.test(token)) {
        return maskChar.repeat(token.length);
      }

      return token;
    })
    .join('');
}

/** Unicode Time Tokens that are allowed to be used with date-fns. */
export const UNICODE_TIME_TOKENS = [
  'H',
  'HH', // Hours (24h)
  'h',
  'hh', // Hours (12h)
  'm',
  'mm', // Minutes
  's',
  'ss', // Seconds
  'a', // AM/PM
  'aa' // AM/PM
] as const;

type TimeToken = (typeof UNICODE_TIME_TOKENS)[number];

const TIME_TOKEN_MASK_MAP: Record<TimeToken, string> = {
  H: '0',
  HH: '00',
  h: '0',
  hh: '00',
  m: '0',
  mm: '00',
  s: '0',
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
  y: 'year',
  yy: 'year',
  yyy: 'year',
  yyyy: 'year',
  M: 'month',
  MM: 'month',
  MMM: 'month',
  MMMM: 'month',
  d: 'day',
  dd: 'day',
  H: 'hour',
  HH: 'hour',
  h: 'hour',
  hh: 'hour',
  m: 'minute',
  mm: 'minute',
  s: 'second',
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
  const mask = isDateToken(token)
    ? DATE_TOKEN_MASK_MAP[token]
    : isTimeToken(token)
      ? TIME_TOKEN_MASK_MAP[token]
      : token;

  return mask.length;
}

// #endregion

/**
 * - Parses a format string like "dd/MM/yyyy" or "HH:mm" into its letter-based tokens: ["dd", "MM", "yyyy", "HH", "mm"].
 * - Skips quoted content (used for literal text in format strings).
 * - Groups consecutive letters into single tokens ("yyyy" instead of ["y", "y", "y", "y"]).
 */
function extractTokens(format: string): string[] {
  const tokens: string[] = [];
  let inQuote = false;
  let currentToken = '';
  for (const char of format) {
    if (char === "'") {
      inQuote = !inQuote;
      continue;
    }
    if (!inQuote && /[a-zA-Z]/.test(char)) {
      currentToken += char;
    } else {
      if (currentToken.length > 0) {
        tokens.push(currentToken);
        currentToken = '';
      }
    }
  }
  if (currentToken.length > 0) {
    tokens.push(currentToken);
  }
  return tokens;
}

/**
 * Breaks a Unicode format string into an array of tokens and literal characters.
 * Groups consecutive alphabetic characters (e.g. 'yyyy') as single tokens.
 * Quoted text is treated as literal and preserved as-is (not tokenized).
 *
 * For example:
 *   tokenizeFormat("dd/MM/yyyy") => ['dd', '/', 'MM', '/', 'yyyy']
 *   tokenizeFormat("yyyy 'year' MM") => ['yyyy', ' ', 'year', ' ', 'MM']
 *   tokenizeFormat("HH:mm") => ['HH', ':', 'mm']
 *
 * @param format - The Unicode format string (e.g. 'yyyy-MM-dd' or 'HH:mm')
 * @returns An array of tokens and literals for further processing.
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
