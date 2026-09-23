import { NgxMaskConfig } from 'ngx-mask';

// #region Configuration

/** ngx-mask's token table: one entry per mask character, mapping it to the characters it accepts. */
export type MaskPatterns = Record<string, { pattern: RegExp; optional?: boolean; symbol?: string }>;

/**
 * ngx-mask's own placeholder character. Every masked field binds it explicitly rather than inheriting it,
 * so a global `provideNgxMask` cannot change what the library reads a value back out of.
 */
export const DEFAULT_PLACEHOLDER_CHARACTER = '_';

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
    | 'placeHolderCharacter'
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

// #endregion

// #region Placeholder Validation

/**
 * Whether a mask could render its placeholder character where a value character belongs, which makes the
 * two indistinguishable in the rendered text — and that text is all the caret rules have to read.
 *
 * True when a token pattern accepts the character, or when the mask draws it as a literal. The way out is
 * a `placeHolderCharacter` the mask cannot otherwise produce.
 */
export function isPlaceholderAmbiguous(mask: string, config: Required<MaskConfigSubset>): boolean {
  const { placeHolderCharacter, patterns, specialCharacters } = config;
  if (!placeHolderCharacter) return false;

  const typeable = Object.values(patterns).some((token) => token.pattern.test(placeHolderCharacter));

  return typeable || specialCharacters.includes(placeHolderCharacter) || mask.includes(placeHolderCharacter);
}

// #endregion

// #region MinLeght/MaxLength Validation

/** How long a masked value can render. `variable` is what makes a length indicator show a range, not a total. */
export interface MaskLengthInfo {
  min: number;
  max: number;
  variable: boolean;
}

const REQUIRED = new Set<string>(['0', 'A', 'S', 'U', 'L', 'H', 'h', 'm', 's', 'd', 'M']);
const OPTIONAL = new Set<string>(['9']);

function expandRepeats(mask: string): string {
  return mask.replace(/(.)\{(\d+)\}/g, (_, ch: string, n: string) => ch.repeat(+n));
}

/**
 * Compute the visible (display) length range for a mask.
 * Counts literals + required tokens as min; adds optional tokens for max.
 * Adds prefix/suffix lengths if provided.
 */
export function analyzeMaskDisplayLength(mask: string, opts?: { prefix?: string; suffix?: string }): MaskLengthInfo {
  if (!mask) return { min: 0, max: Infinity, variable: true };

  // unbounded masks
  if (mask.includes('*') || mask.includes('separator')) {
    return { min: 0, max: Infinity, variable: true };
  }

  const variants = mask.split('||').map((v) => expandRepeats(v.trim()));

  let globalMin = Number.POSITIVE_INFINITY;
  let globalMax = 0;
  let anyOptional = false;

  for (const variant of variants) {
    let required = 0;
    let optional = 0;
    let literal = 0;

    for (let i = 0; i < variant.length; i++) {
      const ch = variant.charAt(i); // <- avoids string|undefined

      // support escaped literal (e.g. \()
      if (ch === '\\' && i + 1 < variant.length) {
        literal++;
        i++; // skip next char; it's consumed as a literal
        continue;
      }

      if (REQUIRED.has(ch)) required++;
      else if (OPTIONAL.has(ch)) optional++;
      else literal++; // any other char is a visible literal
    }

    const minLen = required + literal;
    const maxLen = required + optional + literal;

    anyOptional ||= optional > 0;
    globalMin = Math.min(globalMin, minLen);
    globalMax = Math.max(globalMax, maxLen);
  }

  if (globalMin === Number.POSITIVE_INFINITY) globalMin = 0;

  const prefixLen = (opts?.prefix ?? '').length;
  const suffixLen = (opts?.suffix ?? '').length;

  return {
    min: globalMin + prefixLen + suffixLen,
    max: globalMax + prefixLen + suffixLen,
    variable: anyOptional || variants.length > 1
  };
}

// #endregion
