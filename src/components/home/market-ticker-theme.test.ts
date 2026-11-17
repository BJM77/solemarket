import { describe, it, expect } from 'vitest';
import { contrastRatio, hexToRgb, type RGB } from '@/lib/team-themes/color';
import { allTeamChoices, buildTeamThemeVars } from '@/lib/team-themes/theme';
import { MARKET_TICKER_THEME_CLASSES, marketTickerSurfaceClass } from './market-ticker-theme';

/** Default Benched orange and ink text from globals.css (:root --primary / --primary-foreground). */
const BENCHED_ORANGE = hexToRgb('#f26c0d');
const BENCHED_INK = hexToRgb('#111111');

/** Parse "H S% L%" back to RGB the way hsl(var(--primary)) is rendered. */
function hslTripletToRgb(t: string): RGB {
  const [h, s, l] = t.replace(/%/g, '').split(' ').map(Number);
  const sn = s / 100, ln = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sn * Math.min(ln, 1 - ln);
  const f = (n: number) => ln - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}

describe('market ticker theme', () => {
  it('uses the same primary tokens and button-like feel as the homepage buttons', () => {
    expect(MARKET_TICKER_THEME_CLASSES.background).toBe('bg-primary');
    expect(MARKET_TICKER_THEME_CLASSES.foreground).toBe('text-primary-foreground');
    expect(MARKET_TICKER_THEME_CLASSES.radius).toBe('rounded-xl');
    expect(MARKET_TICKER_THEME_CLASSES.weight).toBe('font-bold');

    const surface = marketTickerSurfaceClass();
    expect(surface).toContain('bg-primary');
    expect(surface).toContain('text-primary-foreground');
    expect(surface).toContain('rounded-xl');
    expect(surface).toContain('font-bold');
    expect(surface).toContain('shadow-md');
    expect(surface).not.toContain('w-full');
  });

  it('keeps compact and waiting variants on the same theme tokens', () => {
    const compact = marketTickerSurfaceClass({ compact: true });
    const waiting = marketTickerSurfaceClass({ waiting: true });
    for (const cls of [compact, waiting]) {
      expect(cls).toContain('bg-primary');
      expect(cls).toContain('text-primary-foreground');
      expect(cls).toContain('rounded-xl');
    }
  });

  it('default Benched orange ticker text and inverted price badge meet WCAG AA', () => {
    expect(contrastRatio(BENCHED_ORANGE, BENCHED_INK)).toBeGreaterThanOrEqual(4.5);
  });

  it('every team theme keeps ticker background and contrast-safe foreground at WCAG AA', () => {
    for (const choice of allTeamChoices()) {
      const vars = buildTeamThemeVars(choice)!;
      const bg = hslTripletToRgb(vars['--primary']);
      const fg = hslTripletToRgb(vars['--primary-foreground']);
      expect(contrastRatio(bg, fg), `${choice} ticker`).toBeGreaterThanOrEqual(4.5);
    }
  });
});
