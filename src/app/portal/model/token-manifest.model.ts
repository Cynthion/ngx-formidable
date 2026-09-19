/** How a variable reaches the cascade, which decides whether the portal may offer a control for it. */
export type ThemeTokenClass =
  /** Declared in the library's `:root` block. The bulk of the surface. */
  | 'declared'
  /** Overridable, read at a use site, never declared — the four logical corners and two thicknesses. */
  | 'overridable';

/**
 * The editor a variable takes. Curated, never inferred: a quoted string for the required marker, a timing
 * function, unitless line heights used as multiplicands, box-shadow composites and a colour whose name
 * carries no colour prefix all defeat inference from the value.
 */
export type ThemeTokenControl =
  | 'color'
  | 'length'
  | 'radius-shorthand'
  | 'multiplier'
  | 'font-weight'
  | 'integer'
  | 'duration'
  | 'easing'
  | 'shadow'
  | 'quoted-string';

/** One editable `--formidable-*` custom property. */
export interface ThemeToken {
  readonly name: string;
  readonly group: ThemeTokenGroup;
  readonly control: ThemeTokenControl;
  readonly class: ThemeTokenClass;
  /** The variable this one falls back to when unset. Editing a derived variable pins it. */
  readonly derivedFrom?: string;
  /** Whether the variable is one of the twelve the theming ladder starts from. */
  readonly seed?: boolean;
  /** The one-line description shown as inline help, taken from `user/theme-reference.md`. */
  readonly description: string;
}

/** A variable the library overwrites on the next render, so the portal never offers a control for it. */
export interface WrittenToken {
  readonly name: string;
  readonly setBy: string;
}

/** The manifest's groups, which are the sections of `user/theme-reference.md`. */
export type ThemeTokenGroup = string;
