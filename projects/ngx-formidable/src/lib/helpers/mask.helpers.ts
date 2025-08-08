import { NgxMaskConfig } from 'ngx-mask';

export type MaskPatterns = Record<string, { pattern: RegExp; optional?: boolean; symbol?: string }>;

/** Defaults from https://github.com/JsDaddy/ngx-mask/blob/develop/USAGE.md */
export const DEFAULT_SPECIAL_CHARACTERS: string[] = [
  '-',
  '/',
  '(',
  ')',
  '.',
  ':',
  ' ',
  '+',
  ',',
  '@',
  '[',
  ']',
  '"',
  "'"
];

/** Defaults from https://github.com/JsDaddy/ngx-mask/blob/develop/USAGE.md */
export const DEFAULT_PATTERNS: MaskPatterns = {
  '0': { pattern: /\d/ },
  '9': { pattern: /\d/, optional: true },
  'A': { pattern: /[a-zA-Z0-9]/ },
  'S': { pattern: /[a-zA-Z]/ },
  'U': { pattern: /[A-Z]/ },
  'L': { pattern: /[a-z]/ }
};

/** The ngx-mask options that are bound in field templates. */
export type MaskConfigSubset = Partial<
  Pick<
    NgxMaskConfig,
    | 'validation'
    | 'showMaskTyped'
    | 'dropSpecialCharacters'
    | 'specialCharacters'
    | 'thousandSeparator'
    | 'decimalMarker'
    | 'prefix'
    | 'suffix'
    | 'allowNegativeNumbers'
    | 'leadZeroDateTime'
    | 'patterns'
    | 'clearIfNotMatch'
  >
>;
