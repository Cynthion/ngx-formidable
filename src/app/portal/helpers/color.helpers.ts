/** An sRGB colour with its alpha, as the browser reports a resolved `color`. */
export interface Rgb {
  readonly r: number;
  readonly g: number;
  readonly b: number;
  readonly a: number;
}

const HEX = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

/**
 * Parses the `rgb()` / `rgba()` / hex forms a resolved colour arrives in. Returns `null` for anything else —
 * a keyword, a `color-mix()` or a gradient — which the caller resolves through the browser first.
 */
export function parseRgb(value: string): Rgb | null {
  const input = value.trim();

  if (HEX.test(input)) {
    const hex = input.slice(1);
    const wide = hex.length > 4;
    const size = wide ? 2 : 1;
    const part = (index: number): number => {
      const chunk = hex.slice(index * size, index * size + size);
      return parseInt(wide ? chunk : chunk + chunk, 16);
    };
    const hasAlpha = hex.length === 4 || hex.length === 8;

    return { r: part(0), g: part(1), b: part(2), a: hasAlpha ? part(3) / 255 : 1 };
  }

  const fn = input.match(/^rgba?\(([^)]+)\)$/i);
  if (!fn) return null;

  const parts = fn[1]!.split(/[\s,/]+/).filter(Boolean);
  if (parts.length < 3) return null;

  const channel = (raw: string): number => {
    const numeric = parseFloat(raw);
    return raw.endsWith('%') ? Math.round((numeric / 100) * 255) : numeric;
  };
  const alphaRaw = parts[3];
  const alpha = alphaRaw === undefined ? 1 : alphaRaw.endsWith('%') ? parseFloat(alphaRaw) / 100 : parseFloat(alphaRaw);

  return { r: channel(parts[0]!), g: channel(parts[1]!), b: channel(parts[2]!), a: Number.isNaN(alpha) ? 1 : alpha };
}

/** Composites a translucent colour over an opaque one, which is what a contrast ratio has to be measured on. */
export function flatten(foreground: Rgb, background: Rgb): Rgb {
  if (foreground.a >= 1) return foreground;

  const mix = (f: number, b: number): number => Math.round(f * foreground.a + b * (1 - foreground.a));

  return {
    r: mix(foreground.r, background.r),
    g: mix(foreground.g, background.g),
    b: mix(foreground.b, background.b),
    a: 1
  };
}

function channelLuminance(value: number): number {
  const scaled = value / 255;

  return scaled <= 0.03928 ? scaled / 12.92 : Math.pow((scaled + 0.055) / 1.055, 2.4);
}

/** WCAG relative luminance. */
export function relativeLuminance(color: Rgb): number {
  return 0.2126 * channelLuminance(color.r) + 0.7152 * channelLuminance(color.g) + 0.0722 * channelLuminance(color.b);
}

/** WCAG contrast ratio, from 1 to 21. The foreground is composited over the background first. */
export function contrastRatio(foreground: Rgb, background: Rgb): number {
  const front = relativeLuminance(flatten(foreground, background));
  const back = relativeLuminance(background);
  const lighter = Math.max(front, back);
  const darker = Math.min(front, back);

  return (lighter + 0.05) / (darker + 0.05);
}

/** Rounds a ratio the way the badges state it, so `4.4999` never reads as a passing `4.5`. */
export function formatRatio(ratio: number): string {
  return (Math.floor(ratio * 100) / 100).toFixed(2);
}

/** Normalizes whatever a colour well produced into the `#rrggbb` a native colour input accepts. */
export function toHex(color: Rgb): string {
  const part = (value: number): string =>
    Math.max(0, Math.min(255, Math.round(value)))
      .toString(16)
      .padStart(2, '0');

  return `#${part(color.r)}${part(color.g)}${part(color.b)}`;
}

/** Whether a value names a colour at all. A gradient is not a `<color>` and invalidates every `color-mix()`. */
export function isGradient(value: string): boolean {
  return /gradient\s*\(/i.test(value);
}
