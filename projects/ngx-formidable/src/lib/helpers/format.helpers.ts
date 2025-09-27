import { isValid } from 'date-fns';

export function isValidDateObject(value: unknown): boolean {
  return value instanceof Date && isValid(value);
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
