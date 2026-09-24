import { computed, DOCUMENT, effect, inject, Injectable, signal } from '@angular/core';
import { DEFAULT_EXPORT_OPTIONS, exportTheme, ThemeExportOptions } from '../export/theme-export';
import { importTheme, ThemeImportResult } from '../export/theme-import';
import { contrastRatio, parseRgb, Rgb, toHex } from '../helpers/color.helpers';
import { FONT_FAMILY_TOKEN, PageSurface, PRESETS_BY_KEY, STARTING_PRESET_KEY, ThemePreset } from '../model/presets';
import { COLOR_SCHEMES, ColorKey, GEOMETRY_SCHEMES, GeometryKey, SCHEME_VARS, ThemeVars } from '../model/schemes';
import { THEME_TOKENS_BY_NAME } from '../model/token-manifest';

/** How the portal's own chrome paints itself. Not the page behind the form, and never exported. */
export type PortalAppearance = 'system' | 'light' | 'dark';

/** One contrast obligation, as the badges state it. */
interface ContrastCheck {
  readonly token: string;
  readonly label: string;
  readonly required: number;
  readonly ratio: number;
  readonly passes: boolean;
}

const STORAGE_KEY = 'portal.theme';

/** The page the portal opens on when no preset says otherwise. Not exported unless it has been changed. */
const DEFAULT_PAGE: PageSurface = { background: '#ffffff', text: '#1e293b' };

interface PersistedTheme {
  readonly presetKey: string | null;
  readonly geometry: GeometryKey | null;
  readonly color: ColorKey | null;
  readonly overrides: Record<string, string>;
  readonly page: PageSurface;
  readonly appearance: PortalAppearance;
}

const CONTRAST_OBLIGATIONS: readonly { token: string; label: string; required: number }[] = [
  { token: '--formidable-color-field-text', label: 'Field text', required: 4.5 },
  { token: '--formidable-color-field-placeholder', label: 'Placeholder', required: 4.5 },
  { token: '--formidable-color-validation-error', label: 'Error', required: 4.5 },
  { token: '--formidable-color-field-border-focus', label: 'Focus border', required: 3 },
  { token: '--formidable-color-field-label-floating', label: 'Floating label', required: 3 }
];

/**
 * The user's theme, the preset and scheme it came from, and the resolved result.
 *
 * The theme is written to `:root`, as a consumer would write it. A custom property's `var()` is substituted
 * where the property is **declared**, and most of the library's are derived and declared once in its `:root`
 * block — so scoping the theme to the preview subtree would not fail visibly, it would half-apply. Writing to
 * `:root` also means what the user copies is the block that is live, so the export cannot drift from the page.
 */
@Injectable({ providedIn: 'root' })
export class ThemeStore {
  private readonly doc = inject(DOCUMENT);

  public readonly presetKey = signal<string | null>(STARTING_PRESET_KEY);

  /** Either axis is `null` once a theme has been imported onto the library defaults: there is no scheme then. */
  public readonly geometry = signal<GeometryKey | null>('outlined');
  public readonly color = signal<ColorKey | null>('slate');

  /** The user's own per-variable edits, which outrank whatever the schemes set. */
  public readonly overrides = signal<Readonly<Record<string, string>>>({});

  public readonly page = signal<PageSurface>(DEFAULT_PAGE);
  public readonly appearance = signal<PortalAppearance>('system');

  public readonly exportOptions = signal<ThemeExportOptions>(DEFAULT_EXPORT_OPTIONS);
  public readonly showOnlyChanged = signal(false);

  /** The one computed both the applied properties and the export text are read off. */
  public readonly resolved = computed<Readonly<Record<string, string>>>(() => {
    const geometry = this.geometry();
    const color = this.color();

    return {
      ...(geometry ? GEOMETRY_SCHEMES[geometry] : {}),
      ...(color ? COLOR_SCHEMES[color] : {}),
      ...this.overrides()
    };
  });

  /**
   * The resolved theme with every declaration that only restates the library's own default dropped.
   *
   * The schemes state their values in full, and several of them — the shipped geometry and palette above
   * all — repeat what the tokens already say, in different units. Exporting those is noise, and counting
   * them would make the copy button read twelve before the user has changed anything.
   */
  public readonly changedVars = computed<Readonly<Record<string, string>>>(() =>
    Object.fromEntries(Object.entries(this.resolved()).filter(([name, value]) => this.differsFromDefault(name, value)))
  );

  /** What the copy button states: the number of variables the user has changed, not the token surface. */
  public readonly changeCount = computed(() => Object.keys(this.changedVars()).length + (this.isPageChanged() ? 1 : 0));

  /**
   * What the export block carries.
   *
   * The delta on its own reproduces the theme on the library's own defaults, which is what a consumer pastes
   * onto — and nothing else. Asked for explicitly, the block also states the value in force for every
   * variable a scheme could set and the delta leaves out, so that pasted over another theme it overwrites
   * rather than inherits.
   */
  public readonly exportVars = computed<Readonly<Record<string, string>>>(() => {
    const changed = this.changedVars();

    if (!this.exportOptions().includeDefaults) return changed;

    const style = getComputedStyle(this.ensureThemedProbe(this.resolved()));
    const stated: Record<string, string> = { ...changed };

    for (const name of SCHEME_VARS) {
      if (name in stated) continue;

      const value = this.inForceOn(style, name);

      if (value) stated[name] = value;
    }

    return stated;
  });

  /** What the Export accordion states: the user's own count, or the size of the block when it is stated in full. */
  public readonly exportCount = computed(() =>
    this.exportOptions().includeDefaults ? Object.keys(this.exportVars()).length : this.changeCount()
  );

  public readonly exportText = computed(() =>
    exportTheme({ vars: this.exportVars(), page: this.page() }, this.exportOptions())
  );

  /** Whether the current fill is dark enough that the four values the seeds cannot derive are needed. */
  public readonly needsDarkFillCompanions = computed(() => {
    const fill = this.resolvedRgb('--formidable-color-field-background');

    return fill !== null && this.luminance(fill) < 0.4;
  });

  /** Whether the field border is zero, which also erases five lengths that are not the field's border. */
  public readonly isBorderless = computed(() => {
    const thickness = this.resolved()['--formidable-field-border-thickness'];

    return thickness !== undefined && parseFloat(thickness) === 0;
  });

  public readonly contrastChecks = computed<readonly ContrastCheck[]>(() => {
    // Read through the resolved theme so the badges recompute with it, then measure what the page actually
    // paints — a `color-mix()` or a keyword only has a value once the browser has resolved it.
    this.resolved();

    const fill = this.resolvedRgb('--formidable-color-field-background');
    if (!fill) return [];

    return CONTRAST_OBLIGATIONS.map((obligation) => {
      const color = this.resolvedRgb(obligation.token);
      const ratio = color ? contrastRatio(color, fill) : 0;

      return { ...obligation, ratio, passes: ratio >= obligation.required };
    });
  });

  private appliedKeys = new Set<string>();
  private defaultsProbe: HTMLElement | null = null;
  private themedProbe: HTMLElement | null = null;
  private themedProbeKeys = new Set<string>();
  private colorProbe: HTMLElement | null = null;

  constructor() {
    this.restore();

    // Application diffs against the set of previously applied keys and removes what is no longer set, so a
    // variable dropped from the theme goes back to its token default rather than sticking.
    effect(() => {
      const vars = this.resolved();
      const root = this.doc.documentElement;
      const next = new Set(Object.keys(vars));

      for (const key of this.appliedKeys) {
        if (!next.has(key)) root.style.removeProperty(key);
      }
      for (const [key, value] of Object.entries(vars)) {
        root.style.setProperty(key, value);
      }
      this.appliedKeys = next;
    });

    effect(() => {
      const root = this.doc.documentElement;
      const page = this.page();

      root.style.setProperty('--portal-page-background', page.background);
      root.style.setProperty('--portal-page-text', page.text);
    });

    effect(() => {
      this.doc.documentElement.dataset['portalAppearance'] = this.appearance();
    });

    effect(() => this.persist());
  }

  // #region Selection

  public applyPreset(preset: ThemePreset): void {
    this.presetKey.set(preset.key);
    this.geometry.set(preset.geometry);
    this.color.set(preset.color);
    this.overrides.set(preset.fontFamily ? { [FONT_FAMILY_TOKEN]: preset.fontFamily } : {});
    this.page.set(preset.page);
  }

  public setGeometry(key: GeometryKey): void {
    this.geometry.set(key);
    this.presetKey.set(null);
  }

  public setColor(key: ColorKey): void {
    this.color.set(key);
    this.presetKey.set(null);
  }

  /**
   * An arbitrary pair of the two axes, with a page surface taken from the palette's own fill so the form
   * does not land on a page that fights it.
   */
  public randomize(geometry: GeometryKey, color: ColorKey, fontFamily: string): void {
    this.presetKey.set(null);
    this.geometry.set(geometry);
    this.color.set(color);
    this.overrides.set({ [FONT_FAMILY_TOKEN]: fontFamily });
    this.page.set(this.pageForPalette(color));
  }

  /** A page a shade off the palette's field fill, which is what most consumer pages actually are. */
  private pageForPalette(color: ColorKey): PageSurface {
    const scheme = COLOR_SCHEMES[color];
    const fill = this.resolveColorValue(scheme['--formidable-color-field-background'] ?? '#ffffff');
    const text = this.resolveColorValue(scheme['--formidable-color-field-text'] ?? '#1e293b');

    if (!fill || !text) return DEFAULT_PAGE;

    const dark = this.luminance(fill) < 0.4;
    const shade = (channel: number): number => Math.max(0, Math.min(255, channel + (dark ? -10 : -6)));

    return {
      background: toHex({ r: shade(fill.r), g: shade(fill.g), b: shade(fill.b), a: 1 }),
      text: toHex(text)
    };
  }

  // #endregion

  // #region Editing

  public setVariable(name: string, value: string): void {
    this.overrides.update((current) => ({ ...current, [name]: value }));
    this.presetKey.set(null);
  }

  public setVariables(vars: ThemeVars): void {
    this.overrides.update((current) => ({ ...current, ...vars }));
    this.presetKey.set(null);
  }

  /** Drops the user's own override, so the variable falls back to the scheme and then to its token default. */
  public clearVariable(name: string): void {
    this.overrides.update((current) => {
      const { [name]: _dropped, ...rest } = current;

      return rest;
    });
  }

  public reset(): void {
    this.overrides.set({});
    this.geometry.set('outlined');
    this.color.set('slate');
    this.presetKey.set(null);
    this.page.set(DEFAULT_PAGE);
  }

  /**
   * Reads a pasted block back in.
   *
   * `applyDefaults` first strips the theme back to the library's own defaults — both axes dropped, no
   * overrides, the default page — so a block that only states the delta reproduces exactly the
   * theme that produced it. Merged onto what is on screen instead, any scheme value the delta does not
   * happen to restate survives into the result, which is a theme neither side asked for.
   */
  public importFrom(source: string, applyDefaults = false): ThemeImportResult {
    const result = importTheme(source);

    if (applyDefaults) {
      this.presetKey.set(null);
      this.geometry.set(null);
      this.color.set(null);
      this.overrides.set({});
      this.page.set(DEFAULT_PAGE);
    }

    if (Object.keys(result.vars).length) this.setVariables(result.vars);
    if (result.page.background || result.page.text) {
      this.page.update((page) => ({
        background: result.page.background ?? page.background,
        text: result.page.text ?? page.text
      }));
    }

    return result;
  }

  // #endregion

  // #region Values

  /** The value in force for a variable: the user's, the scheme's, or the library's own token default. */
  public valueOf(name: string): string {
    return this.resolved()[name] ?? this.defaultOf(name);
  }

  /**
   * Whether the variable says anything the library's own default does not. This is what the changed dot,
   * the reset affordance and the "only what I changed" view all read, so that view really is the export.
   */
  public isChanged(name: string): boolean {
    return name in this.changedVars();
  }

  /**
   * The library's own default, read at runtime rather than stored, so a default cannot drift from the token
   * that produces it. The probe re-emits the library's `:root` block under its own selector, which is where
   * the derived values recompute against the defaults instead of against the user's theme.
   */
  public defaultOf(name: string): string {
    const token = THEME_TOKENS_BY_NAME.get(name);

    // The ones read at a use site are declared nowhere, so their default is whatever they fall back to. They
    // are never read off the probe: undeclared, it inherits them from the user's theme on `:root`.
    if (token?.class !== 'overridable') {
      const declared = getComputedStyle(this.ensureDefaultsProbe()).getPropertyValue(name).trim();

      if (declared) return declared;
    }

    const base = token?.derivedFrom;

    return base ? this.defaultOf(base) : '';
  }

  /** Resolves any colour expression — a keyword, a `color-mix()`, a `var()` — to what the page paints. */
  public resolvedRgb(name: string): Rgb | null {
    const probe = this.ensureColorProbe();

    probe.style.color = '';
    probe.style.color = `var(${name})`;

    return parseRgb(getComputedStyle(probe).color);
  }

  public resolveColorValue(value: string): Rgb | null {
    const probe = this.ensureColorProbe();

    probe.style.color = '';
    probe.style.color = value;

    return parseRgb(getComputedStyle(probe).color);
  }

  // #endregion

  private luminance(color: Rgb): number {
    return (0.2126 * color.r + 0.7152 * color.g + 0.0722 * color.b) / 255;
  }

  /**
   * The value a variable has under a theme, read off the browser rather than worked out.
   *
   * The manifest records what a variable falls back to, not whether the library's declaration is an alias
   * for that one or builds something else out of it — the focus shadow is three values wide and names two
   * variables. The block recomputes, so a declared variable's value already carries whatever the theme says
   * about the ones underneath it. Only the six the library declares nowhere have to follow their own
   * fallback, and those are aliases outright.
   */
  private inForceOn(style: CSSStyleDeclaration, name: string): string {
    const declared = style.getPropertyValue(name).trim();

    if (declared) return declared;

    const base = THEME_TOKENS_BY_NAME.get(name)?.derivedFrom;

    return base ? this.inForceOn(style, base) : '';
  }

  private isPageChanged(): boolean {
    const page = this.page();

    return page.background !== DEFAULT_PAGE.background || page.text !== DEFAULT_PAGE.text;
  }

  /**
   * Whether a value says anything the token default does not. Compared through the browser rather than as
   * text, because `56px` and `3.5rem` are the same length and the schemes and the tokens disagree on which
   * to write. Anything the browser cannot resolve is treated as a change, so a variable is never dropped
   * from the export on a guess.
   */
  private differsFromDefault(name: string, value: string): boolean {
    const fallback = this.defaultOf(name);

    if (!fallback) return true;
    if (value.trim() === fallback.trim()) return false;

    const control = THEME_TOKENS_BY_NAME.get(name)?.control;

    if (control === 'color') {
      const a = this.resolveColorValue(value);
      const b = this.resolveColorValue(fallback);

      return !a || !b || toHex(a) !== toHex(b) || a.a !== b.a;
    }

    if (control === 'length') {
      const a = this.resolveLength(value);
      const b = this.resolveLength(fallback);

      return a === null || b === null || a !== b;
    }

    return true;
  }

  /** A length in pixels, as the browser computes it, or `null` for anything that is not one. */
  private resolveLength(value: string): string | null {
    // Guarded rather than trusted to the probe: an invalid `width` falls back to the probe's own, which
    // would read as a valid `0px` and could drop a variable from the export.
    if (!/^(-?[\d.]|calc\(|var\(|min\(|max\(|clamp\()/.test(value.trim())) return null;

    const probe = this.ensureColorProbe();

    probe.style.width = '';
    probe.style.width = value;

    const width = getComputedStyle(probe).width;

    probe.style.width = '';

    return width && width !== 'auto' ? width : null;
  }

  private ensureDefaultsProbe(): HTMLElement {
    if (!this.defaultsProbe) {
      const element = this.doc.createElement('div');
      element.className = 'portal-token-defaults';
      element.setAttribute('aria-hidden', 'true');
      this.doc.body.appendChild(element);
      this.defaultsProbe = element;
    }

    return this.defaultsProbe;
  }

  /**
   * The same re-emitted block with the theme written over it, which is where a variable the theme leaves
   * unsaid recomputes against the ones it does say. Kept off `:root` so a read is not waiting on the effect
   * that paints the page.
   */
  private ensureThemedProbe(vars: Readonly<Record<string, string>>): HTMLElement {
    if (!this.themedProbe) {
      const element = this.doc.createElement('div');
      element.className = 'portal-token-defaults';
      element.setAttribute('aria-hidden', 'true');
      this.doc.body.appendChild(element);
      this.themedProbe = element;
    }

    const next = new Set(Object.keys(vars));

    for (const key of this.themedProbeKeys) {
      if (!next.has(key)) this.themedProbe.style.removeProperty(key);
    }
    for (const [key, value] of Object.entries(vars)) {
      this.themedProbe.style.setProperty(key, value);
    }
    this.themedProbeKeys = next;

    return this.themedProbe;
  }

  private ensureColorProbe(): HTMLElement {
    if (!this.colorProbe) {
      const element = this.doc.createElement('span');
      element.className = 'portal-color-probe';
      element.setAttribute('aria-hidden', 'true');
      this.doc.body.appendChild(element);
      this.colorProbe = element;
    }

    return this.colorProbe;
  }

  private persist(): void {
    const state: PersistedTheme = {
      presetKey: this.presetKey(),
      geometry: this.geometry(),
      color: this.color(),
      overrides: { ...this.overrides() },
      page: this.page(),
      appearance: this.appearance()
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // A blocked or full storage is not a reason to stop theming.
    }
  }

  private restore(): void {
    const stored = this.readStored();

    if (!stored) {
      const preset = PRESETS_BY_KEY.get(STARTING_PRESET_KEY);
      if (preset) this.applyPreset(preset);

      return;
    }

    if (stored.geometry === null || stored.geometry in GEOMETRY_SCHEMES) this.geometry.set(stored.geometry);
    if (stored.color === null || stored.color in COLOR_SCHEMES) this.color.set(stored.color);
    this.presetKey.set(stored.presetKey);
    this.overrides.set(stored.overrides ?? {});
    if (stored.page) this.page.set(stored.page);
    if (stored.appearance) this.appearance.set(stored.appearance);
  }

  private readStored(): PersistedTheme | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);

      return raw ? (JSON.parse(raw) as PersistedTheme) : null;
    } catch {
      return null;
    }
  }
}
