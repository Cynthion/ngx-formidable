import { PageSurface } from '../model/presets';
import { LIBRARY_WRITTEN_TOKENS, THEME_TOKENS_BY_NAME } from '../model/token-manifest';

type ImportSkipReason =
  'not-a-formidable-variable' | 'not-in-the-manifest' | 'written-by-the-library' | 'unrecognised-declaration';

interface ImportSkip {
  readonly text: string;
  readonly reason: ImportSkipReason;
}

export interface ThemeImportResult {
  readonly vars: Readonly<Record<string, string>>;
  readonly page: Partial<PageSurface>;
  readonly skipped: readonly ImportSkip[];
}

const WRITTEN = new Set(LIBRARY_WRITTEN_TOKENS.map((token) => token.name));

/** Strips block and line comments, so a commented export parses back to exactly what produced it. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/[^\n]*/g, '$1');
}

interface Block {
  readonly selector: string;
  readonly body: string;
}

function blocks(source: string): Block[] {
  const found: Block[] = [];
  const pattern = /([^{}]+)\{([^{}]*)\}/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(source)) !== null) {
    found.push({ selector: match[1]!.trim(), body: match[2]! });
  }

  return found;
}

function declarations(body: string): { property: string; value: string }[] {
  return body
    .split(';')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const colon = entry.indexOf(':');
      if (colon < 0) return null;

      return { property: entry.slice(0, colon).trim(), value: entry.slice(colon + 1).trim() };
    })
    .filter((entry): entry is { property: string; value: string } => entry !== null && entry.value.length > 0);
}

/**
 * Parses a pasted theme block, applies what it recognises and lists what it did not.
 *
 * A block with no selector at all is read as the `:root` block, so a bare list of declarations pasted out of
 * a snippet still imports. Anything outside the manifest is skipped rather than applied, because a variable
 * the library does not declare produces a control that appears to do nothing.
 */
export function importTheme(source: string): ThemeImportResult {
  const cleaned = stripComments(source);
  const vars: Record<string, string> = {};
  const page: { background?: string; text?: string } = {};
  const skipped: ImportSkip[] = [];

  const parsed = blocks(cleaned);
  const bare = parsed.length === 0 ? [{ selector: ':root', body: cleaned }] : parsed;

  for (const block of bare) {
    const isPageBlock = /\b(body|html)\b/.test(block.selector) && !block.selector.includes(':root');

    for (const { property, value } of declarations(block.body)) {
      if (property.startsWith('--')) {
        if (!property.startsWith('--formidable-')) {
          skipped.push({ text: `${property}: ${value}`, reason: 'not-a-formidable-variable' });
        } else if (WRITTEN.has(property)) {
          skipped.push({ text: property, reason: 'written-by-the-library' });
        } else if (!THEME_TOKENS_BY_NAME.has(property)) {
          skipped.push({ text: property, reason: 'not-in-the-manifest' });
        } else {
          vars[property] = value;
        }
        continue;
      }

      if (isPageBlock && (property === 'background' || property === 'background-color')) {
        page.background = value;
        continue;
      }

      if (isPageBlock && property === 'color') {
        page.text = value;
        continue;
      }

      skipped.push({ text: `${property}: ${value}`, reason: 'unrecognised-declaration' });
    }
  }

  return { vars, page, skipped };
}

/** How the import report names each reason. */
export const IMPORT_SKIP_LABELS: Readonly<Record<ImportSkipReason, string>> = {
  'not-a-formidable-variable': 'Not a --formidable-* variable',
  'not-in-the-manifest': 'Not a variable this library declares',
  'written-by-the-library': 'Written by the library on every render',
  'unrecognised-declaration': 'Not a declaration the portal owns'
};
