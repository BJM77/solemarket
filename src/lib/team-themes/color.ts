/** Small colour helpers for team themes (WCAG 2.x contrast). Pure, no DOM. */
export type RGB = [number, number, number];

export function hexToRgb(hex: string): RGB {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) throw new Error(`Invalid hex colour: ${hex}`);
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex([r, g, b]: RGB): string {
  return '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase();
}

/** WCAG relative luminance (0 = black, 1 = white). */
export function relativeLuminance([r, g, b]: RGB): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** WCAG contrast ratio between two colours (1..21). */
export function contrastRatio(a: RGB | string, b: RGB | string): number {
  const ra = typeof a === 'string' ? hexToRgb(a) : a;
  const rb = typeof b === 'string' ? hexToRgb(b) : b;
  const la = relativeLuminance(ra);
  const lb = relativeLuminance(rb);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

export const WHITE: RGB = [255, 255, 255];
export const BLACK: RGB = [0, 0, 0];
/** Near-black used for dark text on light accents (matches the site's #111111). */
export const INK: RGB = [17, 17, 17];

/** Best readable text colour (white or near-black) on a given background. */
export function readableForeground(bg: RGB | string): RGB {
  const c = typeof bg === 'string' ? hexToRgb(bg) : bg;
  return contrastRatio(c, WHITE) >= contrastRatio(c, INK) ? WHITE : INK;
}

/** Linear mix: weight 0 = a, 1 = b. */
export function mix(a: RGB, b: RGB, weight: number): RGB {
  return [0, 1, 2].map((i) => Math.round(a[i] + (b[i] - a[i]) * weight)) as RGB;
}

/**
 * Darken `c` toward black until it reaches `target` contrast against `bg`
 * (default white). Returns `c` unchanged if it already passes.
 */
export function darkenToContrast(c: RGB, target = 4.5, bg: RGB = WHITE): RGB {
  if (contrastRatio(c, bg) >= target) return c;
  for (let w = 0.02; w <= 1; w += 0.02) {
    const d = mix(c, BLACK, w);
    if (contrastRatio(d, bg) >= target) return d;
  }
  return BLACK;
}

export function saturation([r, g, b]: RGB): number {
  const max = Math.max(r, g, b) / 255;
  const min = Math.min(r, g, b) / 255;
  const l = (max + min) / 2;
  if (max === min) return 0;
  return l > 0.5 ? (max - min) / (2 - max - min) : (max - min) / (max + min);
}

/** "H S% L%" triplet as used by the shadcn CSS variables (hsl(var(--primary))). */
export function rgbToHslTriplet([r, g, b]: RGB): string {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0);
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h *= 60;
  }
  const r1 = (n: number) => Math.round(n * 10) / 10;
  return `${r1(h)} ${r1(s * 100)}% ${r1(l * 100)}%`;
}

/** "R G B" triplet for Tailwind `rgb(var(--x) / <alpha-value>)` colours. */
export function rgbTriplet([r, g, b]: RGB): string {
  return `${r} ${g} ${b}`;
}
