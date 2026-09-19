/** A set of `--formidable-*` overrides, exactly as a consumer would write them in their own `:root`. */
export type ThemeVars = Readonly<Record<string, string>>;

export type GeometryKey =
  | 'outlined'
  | 'underlined'
  | 'soft'
  | 'compact'
  | 'pill'
  | 'leaf'
  | 'tab'
  | 'brutalist'
  | 'airy'
  | 'borderless'
  | 'unboxed';

export type ColorKey =
  'slate' | 'ocean' | 'sand' | 'forest' | 'plum' | 'mono' | 'clinical' | 'ledger' | 'sunset' | 'midnight';

export interface SchemeMeta<K extends string> {
  readonly key: K;
  readonly label: string;
  readonly reads: string;
}

export const GEOMETRY_SCHEME_META: readonly SchemeMeta<GeometryKey>[] = [
  { key: 'outlined', label: 'Outlined', reads: 'Neutral, universal' },
  { key: 'underlined', label: 'Underlined', reads: 'Familiar, Material-ish' },
  { key: 'soft', label: 'Soft', reads: 'Modern product UI' },
  { key: 'compact', label: 'Compact', reads: 'Admin, back office' },
  { key: 'pill', label: 'Pill', reads: 'Consumer, playful' },
  { key: 'leaf', label: 'Leaf', reads: 'Editorial, boutique' },
  { key: 'tab', label: 'Tab', reads: 'App-like, docked' },
  { key: 'brutalist', label: 'Brutalist', reads: 'Bleeding-edge startup' },
  { key: 'airy', label: 'Airy', reads: 'Premium, calm' },
  { key: 'borderless', label: 'Borderless', reads: 'Flat, chrome-free' },
  { key: 'unboxed', label: 'Unboxed', reads: 'Checklist on a page' }
];

export const COLOR_SCHEME_META: readonly SchemeMeta<ColorKey>[] = [
  { key: 'slate', label: 'Slate', reads: 'Enterprise, SaaS' },
  { key: 'ocean', label: 'Ocean', reads: 'General purpose' },
  { key: 'sand', label: 'Sand', reads: 'Editorial, hospitality' },
  { key: 'forest', label: 'Forest', reads: 'Sustainability, wellness' },
  { key: 'plum', label: 'Plum', reads: 'Creative tools' },
  { key: 'mono', label: 'Mono', reads: 'Documentation, print' },
  { key: 'clinical', label: 'Clinical', reads: 'Medical, pharma' },
  { key: 'ledger', label: 'Ledger', reads: 'Banking, insurance' },
  { key: 'sunset', label: 'Sunset', reads: 'Consumer, lifestyle' },
  { key: 'midnight', label: 'Midnight', reads: 'Developer tools, startups' }
];

/**
 * Geometry only: dimensions, radii and thicknesses. No colour, so any scheme here combines with any colour
 * scheme below.
 *
 * Units are mandatory on every length: a unitless `0` is a `<number>` in `calc()`, not a `<length>`, and
 * would invalidate every declaration that derives from it.
 */
export const GEOMETRY_SCHEMES: Readonly<Record<GeometryKey, ThemeVars>> = {
  // The shipped default, stated in full rather than left empty, so drift between it and `_tokens.scss`
  // shows up as a visible change.
  outlined: {
    '--formidable-field-height': '56px',
    '--formidable-field-border-thickness': '1px',
    '--formidable-border-radius': '8px',
    '--formidable-field-padding-x': '16px'
  },
  // No border, a line inside the bottom edge that thickens on focus, and a field rounded only at the top —
  // so a panel opening below mirrors the square bottom and the pair reads as one box.
  underlined: {
    '--formidable-field-height': '56px',
    '--formidable-field-border-thickness': '0px',
    '--formidable-border-radius': '8px',
    '--formidable-field-border-radius': '0px',
    '--formidable-field-border-start-start-radius': '8px',
    '--formidable-field-border-start-end-radius': '8px',
    '--formidable-field-underline-thickness': '1px',
    '--formidable-field-underline-thickness-focus': '2px',
    '--formidable-field-underline-thickness-invalid': '2px',
    // A field group never takes an underline, and its border thickness follows the field's — which is `0px`
    // here. Left to derive, a focused group would show no focus indicator at all.
    '--formidable-field-group-border-thickness': '1px',
    '--formidable-field-focus-ring-width': '1px',
    '--formidable-panel-border-thickness': '1px',
    '--formidable-toggle-field-track-border-thickness': '1px',
    '--formidable-slider-track-border-thickness': '1px'
  },
  soft: {
    '--formidable-field-height': '60px',
    '--formidable-field-border-thickness': '0px',
    '--formidable-border-radius': '12px',
    '--formidable-field-padding-x': '16px',
    '--formidable-field-group-border-thickness': '1px',
    '--formidable-toggle-field-track-border-thickness': '1px',
    '--formidable-slider-track-border-thickness': '1px',
    '--formidable-field-focus-ring-width': '3px',
    // The one place a geometry scheme touches a colour variable, and the width is not why: this scheme wants
    // a translucent ring, and the library has no variable for a ring colour on its own. All three still read
    // their hue from the active colour scheme, which is what keeps the two axes independent.
    '--formidable-color-field-focus-box-shadow':
      '0 0 0 var(--formidable-field-focus-ring-width) color-mix(in srgb, var(--formidable-color-field-border-focus) 35%, transparent)',
    '--formidable-color-field-group-focus-box-shadow':
      '0 0 0 var(--formidable-field-focus-ring-width) color-mix(in srgb, var(--formidable-color-field-border-focus) 35%, transparent)',
    '--formidable-color-field-focus-box-shadow-invalid':
      '0 0 0 var(--formidable-field-focus-ring-width) color-mix(in srgb, var(--formidable-color-validation-error) 35%, transparent)'
  },
  // 44px is the floor for the `inside` label positions — below it the floating label and the value no longer
  // fit the field's inner height.
  compact: {
    '--formidable-field-height': '44px',
    '--formidable-field-border-thickness': '1px',
    '--formidable-border-radius': '4px',
    '--formidable-field-padding-x': '12px',
    '--formidable-field-font-size': '14px',
    '--formidable-label-font-size': '14px',
    '--formidable-label-floating-font-size': '11px',
    '--formidable-field-toggle-size': '24px',
    '--formidable-field-group-option-padding': '4px 0px',
    '--formidable-option-prefix-dimension-outer': '16px',
    '--formidable-option-prefix-dimension-inner': '6px',
    '--formidable-option-prefix-gap': '10px',
    '--formidable-toggle-field-width': '36px',
    '--formidable-toggle-field-height': '20px',
    '--formidable-toggle-field-thumb-size': '12px'
  },
  pill: {
    '--formidable-field-height': '52px',
    '--formidable-field-border-thickness': '1px',
    '--formidable-border-radius': '16px',
    '--formidable-field-border-radius': '26px',
    '--formidable-field-group-border-radius': '20px',
    '--formidable-field-padding-x': '24px',
    '--formidable-panel-border-radius': '20px',
    '--formidable-toggle-field-track-border-radius': '999px',
    '--formidable-toggle-field-thumb-border-radius': '999px',
    '--formidable-slider-track-border-radius': '999px',
    '--formidable-slider-thumb-border-radius': '999px',
    '--formidable-slider-tick-mark-border-radius': '999px'
  },
  leaf: {
    '--formidable-field-height': '56px',
    '--formidable-field-border-thickness': '1px',
    '--formidable-border-radius': '8px',
    '--formidable-field-border-radius': '2px',
    '--formidable-field-border-start-start-radius': '22px',
    '--formidable-field-border-end-end-radius': '22px',
    '--formidable-field-group-border-radius': '22px 2px',
    '--formidable-field-padding-x': '18px'
  },
  tab: {
    '--formidable-field-height': '56px',
    '--formidable-field-border-thickness': '1px',
    '--formidable-border-radius': '10px',
    '--formidable-field-border-radius': '0px',
    '--formidable-field-border-start-start-radius': '18px',
    '--formidable-field-border-start-end-radius': '18px',
    '--formidable-field-padding-x': '16px'
  },
  brutalist: {
    '--formidable-field-height': '52px',
    '--formidable-field-border-thickness': '3px',
    '--formidable-border-radius': '0px',
    '--formidable-field-padding-x': '14px',
    '--formidable-slider-thumb-border-thickness': '3px',
    '--formidable-color-field-focus-box-shadow': '5px 5px 0 0 var(--formidable-color-field-border-focus)',
    '--formidable-color-field-group-focus-box-shadow': '5px 5px 0 0 var(--formidable-color-field-border-focus)',
    '--formidable-color-field-focus-box-shadow-invalid': '5px 5px 0 0 var(--formidable-color-validation-error)',
    '--formidable-panel-box-shadow': '6px 6px 0 0 var(--formidable-color-field-border)'
  },
  airy: {
    '--formidable-field-height': '72px',
    '--formidable-field-border-thickness': '1px',
    '--formidable-border-radius': '18px',
    '--formidable-field-padding-x': '22px',
    '--formidable-field-before-margin-bottom': '16px',
    '--formidable-textarea-padding-top': '20px'
  },
  // No border and nothing standing in for one. Every one of the five lengths below defaults to the field's
  // border thickness, so at `0px` a theme without them has no panel outline, no group box, and no focus
  // indicator anywhere.
  borderless: {
    '--formidable-field-height': '56px',
    '--formidable-field-border-thickness': '0px',
    '--formidable-border-radius': '4px',
    '--formidable-field-padding-x': '16px',
    '--formidable-field-focus-ring-width': '2px',
    '--formidable-panel-border-thickness': '1px',
    '--formidable-field-group-border-thickness': '1px',
    '--formidable-toggle-field-track-border-thickness': '1px',
    '--formidable-slider-track-border-thickness': '1px'
  },
  // A group stops being a box. `transparent` is the one colour a geometry scheme may set: it names no hue,
  // so the two axes stay independent.
  unboxed: {
    '--formidable-field-height': '56px',
    '--formidable-field-border-thickness': '1px',
    '--formidable-border-radius': '8px',
    '--formidable-field-padding-x': '16px',
    '--formidable-option-prefix-inset': '0px',
    '--formidable-field-group-border-thickness': '0px',
    '--formidable-color-field-group-background': 'transparent',
    '--formidable-color-field-group-background-hovered': 'transparent'
  }
};

/**
 * Colour only: the eight seed variables per scheme. Everything else in the library derives from them, which
 * is the "override the base, not the derivative" rule demonstrated.
 */
export const COLOR_SCHEMES: Readonly<Record<ColorKey, ThemeVars>> = {
  slate: {
    '--formidable-color-validation-error': '#dc2626',
    '--formidable-color-field-text': '#1e293b',
    '--formidable-color-field-placeholder': '#5a6b82',
    '--formidable-color-field-selection': '#c7d2fe',
    '--formidable-color-field-border': '#94a3b8',
    '--formidable-color-field-border-focus': '#4f46e5',
    '--formidable-color-field-background': '#f8fafc',
    '--formidable-color-field-label-floating': '#4338ca'
  },
  ocean: {
    '--formidable-color-validation-error': '#c53030',
    '--formidable-color-field-text': '#00345a',
    '--formidable-color-field-placeholder': '#4a7189',
    '--formidable-color-field-selection': '#9fb7c7',
    '--formidable-color-field-border': '#3e6988',
    '--formidable-color-field-border-focus': '#0b6fa4',
    '--formidable-color-field-background': '#f2faff',
    '--formidable-color-field-label-floating': '#255476'
  },
  sand: {
    '--formidable-color-validation-error': '#b91c1c',
    '--formidable-color-field-text': '#3f2d16',
    '--formidable-color-field-placeholder': '#8a6d4a',
    '--formidable-color-field-selection': '#fde68a',
    '--formidable-color-field-border': '#c9a227',
    '--formidable-color-field-border-focus': '#b45309',
    '--formidable-color-field-background': '#fdf8f0',
    '--formidable-color-field-label-floating': '#92400e'
  },
  forest: {
    '--formidable-color-validation-error': '#be123c',
    '--formidable-color-field-text': '#14342a',
    '--formidable-color-field-placeholder': '#4f6f63',
    '--formidable-color-field-selection': '#a7f3d0',
    '--formidable-color-field-border': '#3f6f5c',
    '--formidable-color-field-border-focus': '#059669',
    '--formidable-color-field-background': '#f4faf7',
    '--formidable-color-field-label-floating': '#047857'
  },
  plum: {
    '--formidable-color-validation-error': '#c2183f',
    '--formidable-color-field-text': '#2e1065',
    '--formidable-color-field-placeholder': '#6d5f8c',
    '--formidable-color-field-selection': '#ddd6fe',
    '--formidable-color-field-border': '#8b7bb8',
    '--formidable-color-field-border-focus': '#7c3aed',
    '--formidable-color-field-background': '#faf5ff',
    '--formidable-color-field-label-floating': '#6d28d9'
  },
  // The error colour stays red on purpose — dropping it would leave validation signalled by shape alone.
  mono: {
    '--formidable-color-validation-error': '#b00020',
    '--formidable-color-field-text': '#111111',
    '--formidable-color-field-placeholder': '#595959',
    '--formidable-color-field-selection': '#d4d4d4',
    '--formidable-color-field-border': '#767676',
    '--formidable-color-field-border-focus': '#111111',
    '--formidable-color-field-background': '#fafafa',
    '--formidable-color-field-label-floating': '#333333'
  },
  clinical: {
    '--formidable-color-validation-error': '#c2410c',
    '--formidable-color-field-text': '#0f2b2e',
    '--formidable-color-field-placeholder': '#4c6b6d',
    '--formidable-color-field-selection': '#99f6e4',
    '--formidable-color-field-border': '#7f9fa1',
    '--formidable-color-field-border-focus': '#0f766e',
    '--formidable-color-field-background': '#f7fdfd',
    '--formidable-color-field-label-floating': '#115e59'
  },
  ledger: {
    '--formidable-color-validation-error': '#991b1b',
    '--formidable-color-field-text': '#1c2c45',
    '--formidable-color-field-placeholder': '#6b6350',
    '--formidable-color-field-selection': '#e7d9ae',
    '--formidable-color-field-border': '#a9a190',
    '--formidable-color-field-border-focus': '#8a6d1f',
    '--formidable-color-field-background': '#fbfaf7',
    '--formidable-color-field-label-floating': '#5b4a12'
  },
  sunset: {
    '--formidable-color-validation-error': '#9f1239',
    '--formidable-color-field-text': '#4c1d24',
    '--formidable-color-field-placeholder': '#9a5f57',
    '--formidable-color-field-selection': '#fecdd3',
    '--formidable-color-field-border': '#f0a08c',
    '--formidable-color-field-border-focus': '#e11d48',
    '--formidable-color-field-background': '#fff7f5',
    '--formidable-color-field-label-floating': '#be123c'
  },
  // The one scheme that cannot live on eight seeds. Each extra marks a real limit in the token model: the
  // readonly and disabled fills are the base mixed toward `transparent`, which lightens a dark field instead
  // of dimming it, and the option fills default to black at low alpha, which is invisible on a dark panel.
  midnight: {
    '--formidable-color-validation-error': '#fb7185',
    '--formidable-color-field-text': '#e8ecf5',
    '--formidable-color-field-placeholder': '#8b95ab',
    '--formidable-color-field-selection': '#334155',
    '--formidable-color-field-border': '#3b465e',
    '--formidable-color-field-border-focus': '#5eead4',
    '--formidable-color-field-background': '#141824',
    '--formidable-color-field-label-floating': '#5eead4',
    '--formidable-color-field-background-readonly': '#1c2130',
    '--formidable-color-field-background-disabled': '#191d29',
    '--formidable-color-field-option-background-selected': 'rgb(255 255 255 / 6%)',
    '--formidable-color-field-option-background-highlighted': 'rgb(255 255 255 / 12%)'
  }
};

/** The four values a dark fill needs beyond the eight seeds, offered by the dark-fill notice. */
export const DARK_FILL_COMPANIONS: readonly string[] = [
  '--formidable-color-field-background-readonly',
  '--formidable-color-field-background-disabled',
  '--formidable-color-field-option-background-selected',
  '--formidable-color-field-option-background-highlighted'
];

/** The five lengths a `0px` field border also erases, named by the borderless notice. */
export const BORDERLESS_COMPANIONS: readonly string[] = [
  '--formidable-field-group-border-thickness',
  '--formidable-field-focus-ring-width',
  '--formidable-panel-border-thickness',
  '--formidable-toggle-field-track-border-thickness',
  '--formidable-slider-track-border-thickness'
];

/** The eight colour seeds, in the order `user/theming.md` lists them. */
export const COLOR_SEEDS: readonly string[] = [
  '--formidable-color-field-background',
  '--formidable-color-field-border',
  '--formidable-color-field-placeholder',
  '--formidable-color-field-text',
  '--formidable-color-field-selection',
  '--formidable-color-field-border-focus',
  '--formidable-color-field-label-floating',
  '--formidable-color-validation-error'
];

/** The four lengths that reshape the field. */
export const SHAPE_SEEDS: readonly string[] = [
  '--formidable-field-height',
  '--formidable-field-border-thickness',
  '--formidable-border-radius',
  '--formidable-field-padding-x'
];
