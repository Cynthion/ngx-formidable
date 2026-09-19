import { ColorKey, GeometryKey } from './schemes';

/** The surface behind the form. The library styles fields and never the page, so this is the consumer's. */
export interface PageSurface {
  readonly background: string;
  readonly text: string;
}

/**
 * A named look: one geometry, one colour, one page surface and one family. The two axes stay independent and
 * remain selectable on their own behind a disclosure — a preset is a starting point, not a mode.
 */
export interface ThemePreset {
  readonly key: string;
  readonly label: string;
  readonly fits: string;
  readonly geometry: GeometryKey;
  readonly color: ColorKey;
  readonly page: PageSurface;
  readonly fontFamily: string;
}

/**
 * A font archetype. Stacks over faces the platform already has rather than a fetched or bundled file: the
 * deploy is static and must work offline and behind a proxy, and a fetched family adds a third-party origin
 * and a flash of unstyled text that undoes the instant repaint the presets exist to demonstrate.
 */
interface FontOption {
  readonly key: string;
  readonly label: string;
  readonly stack: string;
}

export const FONT_OPTIONS: readonly FontOption[] = [
  {
    key: 'grotesque',
    label: 'Grotesque',
    stack: "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
  },
  {
    key: 'humanist',
    label: 'Humanist',
    stack: "Optima, 'Gill Sans', 'Gill Sans MT', 'Trebuchet MS', 'Lucida Grande', sans-serif"
  },
  { key: 'serif', label: 'Serif', stack: "Georgia, 'Iowan Old Style', 'Times New Roman', Times, serif" },
  {
    key: 'monospace',
    label: 'Monospace',
    stack: "ui-monospace, 'SF Mono', SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace"
  },
  {
    key: 'display',
    label: 'Display',
    stack: "'Avenir Next', Avenir, Futura, 'Century Gothic', 'Trebuchet MS', sans-serif"
  }
];

export const DEFAULT_FONT_STACK = FONT_OPTIONS[0]!.stack;

const LIGHT_PAGE: PageSurface = { background: '#ffffff', text: '#1e293b' };

export const THEME_PRESETS: readonly ThemePreset[] = [
  {
    key: 'enterprise',
    label: 'Enterprise',
    fits: 'The shipped default',
    geometry: 'outlined',
    color: 'slate',
    page: LIGHT_PAGE,
    fontFamily: FONT_OPTIONS[0]!.stack
  },
  {
    key: 'material',
    label: 'Material',
    fits: 'Familiar, filled',
    geometry: 'underlined',
    color: 'ocean',
    page: { background: '#f4f8fb', text: '#00345a' },
    fontFamily: FONT_OPTIONS[0]!.stack
  },
  {
    key: 'product',
    label: 'Product',
    fits: 'Modern SaaS',
    geometry: 'soft',
    color: 'plum',
    page: { background: '#f5f2fb', text: '#2e1065' },
    fontFamily: FONT_OPTIONS[0]!.stack
  },
  {
    key: 'back-office',
    label: 'Back Office',
    fits: 'Dense data entry',
    geometry: 'compact',
    color: 'mono',
    page: { background: '#f2f2f2', text: '#111111' },
    fontFamily: FONT_OPTIONS[0]!.stack
  },
  {
    key: 'consumer',
    label: 'Consumer',
    fits: 'Warm and playful',
    geometry: 'pill',
    color: 'sunset',
    page: { background: '#fff1ec', text: '#4c1d24' },
    fontFamily: FONT_OPTIONS[4]!.stack
  },
  {
    key: 'editorial',
    label: 'Editorial',
    fits: 'Boutique, print-adjacent',
    geometry: 'leaf',
    color: 'sand',
    page: { background: '#faf3e7', text: '#3f2d16' },
    fontFamily: FONT_OPTIONS[2]!.stack
  },
  {
    key: 'clinic',
    label: 'Clinic',
    fits: 'High contrast, docked',
    geometry: 'tab',
    color: 'clinical',
    page: { background: '#eefafa', text: '#0f2b2e' },
    fontFamily: FONT_OPTIONS[1]!.stack
  },
  {
    key: 'brutalist',
    label: 'Brutalist',
    fits: 'Loud on purpose',
    geometry: 'brutalist',
    color: 'mono',
    page: { background: '#f5f5f0', text: '#111111' },
    fontFamily: FONT_OPTIONS[3]!.stack
  },
  {
    key: 'private-bank',
    label: 'Private Bank',
    fits: 'Calm and premium',
    geometry: 'airy',
    color: 'ledger',
    page: { background: '#f6f3ec', text: '#1c2c45' },
    fontFamily: FONT_OPTIONS[2]!.stack
  },
  {
    key: 'flat',
    label: 'Flat',
    fits: 'Chrome-free',
    geometry: 'borderless',
    color: 'forest',
    page: { background: '#eef6f2', text: '#14342a' },
    fontFamily: FONT_OPTIONS[1]!.stack
  },
  {
    key: 'checklist',
    label: 'Checklist',
    fits: 'A list on a page',
    geometry: 'unboxed',
    color: 'slate',
    page: LIGHT_PAGE,
    fontFamily: FONT_OPTIONS[0]!.stack
  },
  {
    key: 'midnight',
    label: 'Midnight',
    fits: 'Developer tools',
    geometry: 'soft',
    color: 'midnight',
    page: { background: '#0b0e16', text: '#e8ecf5' },
    fontFamily: FONT_OPTIONS[3]!.stack
  }
];

export const PRESETS_BY_KEY: ReadonlyMap<string, ThemePreset> = new Map(THEME_PRESETS.map((p) => [p.key, p]));

/**
 * What the page opens on. Deliberately not the shipped default, so the first frame is already evidence that
 * the library is configurable.
 */
export const STARTING_PRESET_KEY = 'product';
