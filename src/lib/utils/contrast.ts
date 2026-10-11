/** WCAG relative luminance of a #rgb / #rrggbb colour. Returns null if unparsable. */
export function luminance(hex: string): number | null {
  const m = hex.trim().replace('#', '');
  const full = m.length === 3 ? m.split('').map((c) => c + c).join('') : m;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(full.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number | null {
  const la = luminance(a), lb = luminance(b);
  if (la === null || lb === null) return null;
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Keep the CMS-chosen text colour if it meets WCAG AA (4.5:1) on the background,
 * otherwise switch to whichever of black/white reads better.
 */
export function accessibleTextColor(bg: string, preferred?: string): string | undefined {
  if (preferred && (contrastRatio(bg, preferred) ?? 0) >= 4.5) return preferred;
  const black = contrastRatio(bg, '#000000');
  const white = contrastRatio(bg, '#ffffff');
  if (black === null || white === null) return preferred;
  return black >= white ? '#000000' : '#ffffff';
}
