import { describe, it, expect, beforeEach } from 'vitest';
import { NBA_TEAMS, getTeam, teamLabel, flipColourLabel } from '../teams';
import { contrastRatio, darkenToContrast, hexToRgb, readableForeground, rgbToHex, WHITE, INK, type RGB } from '../color';
import {
  allTeamChoices, buildTeamThemeVars, computeTeamColors, isValidTeamChoice, parseTeamChoice,
  TEAM_THEME_BOOT_SCRIPT, TEAM_THEME_STORAGE_KEY, TEAM_THEME_VAR_KEYS,
} from '../theme';

/** Parse "H S% L%" back to RGB, the way the browser will render hsl(var(--x)). */
function hslTripletToRgb(t: string): RGB {
  const [h, s, l] = t.replace(/%/g, '').split(' ').map(Number);
  const sn = s / 100, ln = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sn * Math.min(ln, 1 - ln);
  const f = (n: number) => ln - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}

describe('contrast helpers', () => {
  it('matches WCAG reference values', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
    expect(contrastRatio('#FFFFFF', '#FFFFFF')).toBeCloseTo(1, 5);
    // Known pair: #777777 on white is ~4.48:1
    expect(contrastRatio('#777777', '#FFFFFF')).toBeCloseTo(4.48, 2);
    // Order-independent
    expect(contrastRatio('#552583', '#FDB927')).toBeCloseTo(contrastRatio('#FDB927', '#552583'), 10);
  });

  it('picks white on dark and ink on light backgrounds', () => {
    expect(readableForeground('#552583')).toEqual(WHITE); // Lakers purple
    expect(readableForeground('#FDB927')).toEqual(INK); // Lakers gold
    expect(readableForeground('#000000')).toEqual(WHITE);
    expect(readableForeground('#FFFFFF')).toEqual(INK);
  });

  it('darkens until the target contrast is met, keeping passing colours', () => {
    const gold = hexToRgb('#FDB927');
    const d = darkenToContrast(gold, 4.5);
    expect(contrastRatio(d, WHITE)).toBeGreaterThanOrEqual(4.5);
    const purple = hexToRgb('#552583');
    expect(darkenToContrast(purple, 4.5)).toEqual(purple);
  });

  it('round-trips hex', () => {
    expect(rgbToHex(hexToRgb('#1d428a'))).toBe('#1D428A');
    expect(() => hexToRgb('nope')).toThrow();
  });
});

describe('NBA team data', () => {
  it('has all 30 teams with unique abbreviations and names', () => {
    expect(NBA_TEAMS).toHaveLength(30);
    expect(new Set(NBA_TEAMS.map((t) => t.abbr)).size).toBe(30);
    expect(new Set(NBA_TEAMS.map((t) => `${t.city} ${t.name}`)).size).toBe(30);
  });

  it('uses valid 6-digit hex colours and 3-letter abbreviations', () => {
    for (const t of NBA_TEAMS) {
      expect(t.abbr).toMatch(/^[A-Z]{3}$/);
      for (const c of [t.primary, t.secondary, t.tertiary].filter(Boolean) as string[]) {
        expect(c).toMatch(/^#[0-9A-F]{6}$/);
      }
      expect(t.primary).not.toBe(t.secondary);
    }
  });

  it('includes the official Lakers palette', () => {
    const lal = getTeam('LAL')!;
    expect(lal.primary).toBe('#552583');
    expect(lal.secondary).toBe('#FDB927');
  });

  it('uses unique city-and-colour labels and flips colours for alt', () => {
    expect(new Set(NBA_TEAMS.map((t) => t.label)).size).toBe(30);
    const lal = getTeam('LAL')!;
    expect(teamLabel(lal)).toBe('LA Purple & Gold');
    expect(teamLabel(lal, true)).toBe('LA Gold & Purple');
    expect(flipColourLabel('Oklahoma City Blue & Orange')).toBe('Oklahoma City Orange & Blue');
    expect(NBA_TEAMS.every((t) => t.label.includes(' & '))).toBe(true);
  });
});

describe('team themes', () => {
  it('validates choices strictly', () => {
    expect(isValidTeamChoice('LAL')).toBe(true);
    expect(isValidTeamChoice('LAL:alt')).toBe(true);
    expect(isValidTeamChoice('lal')).toBe(false);
    expect(isValidTeamChoice('XYZ')).toBe(false);
    expect(isValidTeamChoice('LAL:foo')).toBe(false);
    expect(isValidTeamChoice('BKN:alt')).toBe(false); // white can't be the main colour
    expect(isValidTeamChoice(42)).toBe(false);
    expect(isValidTeamChoice(null)).toBe(false);
    expect(parseTeamChoice('LAL:alt')?.alt).toBe(true);
  });

  it('builds every variable for every choice with accessible contrast', () => {
    const choices = allTeamChoices();
    expect(choices.length).toBeGreaterThanOrEqual(30);
    for (const choice of choices) {
      const vars = buildTeamThemeVars(choice)!;
      expect(Object.keys(vars).sort()).toEqual([...TEAM_THEME_VAR_KEYS].sort());
      for (const v of Object.values(vars)) expect(v).toMatch(/^[0-9 .%]{1,40}$/);

      const primary = hslTripletToRgb(vars['--primary']);
      const fg = hslTripletToRgb(vars['--primary-foreground']);
      const text = hslTripletToRgb(vars['--primary-text']);
      const accent = hslTripletToRgb(vars['--accent']);
      const accentFg = hslTripletToRgb(vars['--accent-foreground']);
      // Buttons: best of white/ink gives >= 4.5 for any colour except mid-tones; require AA-large at minimum.
      expect(contrastRatio(primary, fg), `${choice} button`).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(text, WHITE), `${choice} link`).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(accentFg, accent), `${choice} accent`).toBeGreaterThanOrEqual(4.5);
      const o700 = vars['--orange-700'].split(' ').map(Number) as RGB;
      expect(contrastRatio(o700, WHITE), `${choice} orange-700`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('Lakers: purple dominant by default, gold dominant with dark text when alt', () => {
    const def = computeTeamColors('LAL')!;
    expect(rgbToHex(def.dominant)).toBe('#552583');
    expect(def.foreground).toEqual(WHITE);
    expect(rgbToHex(def.text)).toBe('#552583');
    const alt = computeTeamColors('LAL:alt')!;
    expect(rgbToHex(alt.dominant)).toBe('#FDB927');
    expect(alt.foreground).toEqual(INK);
    // Gold isn't readable as text on white, so links use Lakers purple.
    expect(rgbToHex(alt.text)).toBe('#552583');
  });

  it('returns null for invalid choices', () => {
    expect(buildTeamThemeVars('NOPE')).toBeNull();
  });
});

describe('boot script', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('style');
    document.documentElement.removeAttribute('data-team');
  });

  it('applies cached vars before paint and ignores unsafe entries', () => {
    const vars = buildTeamThemeVars('LAL')!;
    localStorage.setItem(TEAM_THEME_STORAGE_KEY, JSON.stringify({
      k: 'LAL', v: { ...vars, '--evil': 'url(x)', '--primary-text': 'red;background:url(x)' },
    }));
    new Function(TEAM_THEME_BOOT_SCRIPT)();
    const root = document.documentElement;
    expect(root.getAttribute('data-team')).toBe('LAL');
    expect(root.style.getPropertyValue('--primary')).toBe(vars['--primary']);
    expect(root.style.getPropertyValue('--evil')).toBe('');
    expect(root.style.getPropertyValue('--primary-text')).toBe('');
  });

  it('does nothing without a stored theme or with garbage', () => {
    new Function(TEAM_THEME_BOOT_SCRIPT)();
    expect(document.documentElement.getAttribute('data-team')).toBeNull();
    localStorage.setItem(TEAM_THEME_STORAGE_KEY, '{not json');
    expect(() => new Function(TEAM_THEME_BOOT_SCRIPT)()).not.toThrow();
  });
});
