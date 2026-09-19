import { PageSurface } from '../model/presets';
import { THEME_TOKENS, THEME_TOKENS_BY_NAME } from '../model/token-manifest';

export type ThemeExportFormat = 'css' | 'scss';

export interface ThemeExportOptions {
  readonly format: ThemeExportFormat;
  /** Whether the page surface block is emitted. It is the consumer's, not the library's. */
  readonly includePageSurface: boolean;
  /** Whether each variable carries its one-line description from the manifest. */
  readonly includeComments: boolean;
}

export interface ThemeExportInput {
  readonly vars: Readonly<Record<string, string>>;
  /** Emitted as an ordinary declaration: the library exposes no font-family token. */
  readonly fontFamily: string | null;
  readonly page: PageSurface;
}

export const DEFAULT_EXPORT_OPTIONS: ThemeExportOptions = {
  format: 'css',
  includePageSurface: true,
  includeComments: true
};

const MANIFEST_ORDER: ReadonlyMap<string, number> = new Map(THEME_TOKENS.map((token, index) => [token.name, index]));

function comment(text: string, format: ThemeExportFormat): string {
  return format === 'scss' ? `// ${text}` : `/* ${text} */`;
}

/** Manifest order first, so the block reads grouped; anything unknown keeps its own order at the end. */
export function orderedVarNames(vars: Readonly<Record<string, string>>): string[] {
  const names = Object.keys(vars);

  return names.sort((a, b) => {
    const ia = MANIFEST_ORDER.get(a);
    const ib = MANIFEST_ORDER.get(b);

    if (ia === undefined && ib === undefined) return names.indexOf(a) - names.indexOf(b);
    if (ia === undefined) return 1;
    if (ib === undefined) return -1;

    return ia - ib;
  });
}

/**
 * The `:root` block the copy button puts on the clipboard, plus the page surface as a separately commented
 * block. It is produced from the same resolved theme that is applied to the page, so the export cannot drift
 * from what is on screen.
 */
export function exportTheme(input: ThemeExportInput, options: ThemeExportOptions): string {
  const lines: string[] = [':root {'];

  for (const name of orderedVarNames(input.vars)) {
    const token = THEME_TOKENS_BY_NAME.get(name);

    if (options.includeComments && token?.description) {
      lines.push(`  ${comment(token.description, options.format)}`);
    }
    lines.push(`  ${name}: ${input.vars[name]};`);
  }

  if (input.fontFamily) {
    if (options.includeComments) {
      lines.push(
        `  ${comment('The library exposes no font-family token: every field takes the page family through `font: inherit`.', options.format)}`
      );
    }
    lines.push(`  font-family: ${input.fontFamily};`);
  }

  lines.push('}');

  if (options.includePageSurface) {
    lines.push('');
    lines.push(
      comment(
        'The page behind the form. The library styles fields and never the surface they sit on, so this block is yours.',
        options.format
      )
    );
    lines.push('body {');
    lines.push(`  background: ${input.page.background};`);
    lines.push(`  color: ${input.page.text};`);
    lines.push('}');
  }

  return lines.join('\n') + '\n';
}
