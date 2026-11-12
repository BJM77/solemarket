/**
 * Builds the CSS variable overrides for a "Your team" theme.
 *
 * A theme choice is a team abbreviation ("LAL") or, to make the team's
 * secondary colour the dominant one, the abbreviation plus ":alt" ("LAL:alt"
 * = Lakers gold). Only accent variables change: --primary (+ foreground),
 * --ring, --accent (+ foreground), --primary-text (used for text-primary
 * links/labels on white) and the brand `orange-*` Tailwind palette, which is
 * wired to --orange-* RGB variables. Photos, prices and the logo are untouched.
 */
import { NBA_TEAMS, getTeam, type NbaTeam } from './teams';
import {
  type RGB, WHITE, INK, contrastRatio, darkenToContrast, hexToRgb, mix,
  readableForeground, relativeLuminance, rgbToHslTriplet, rgbTriplet, saturation,
} from './color';

export const TEAM_THEME_STORAGE_KEY = 'benched-team-theme';
/** Bump when the variable recipe changes so cached vars get recomputed. */
export const TEAM_THEME_VERSION = 1;
/** Body text target: WCAG AA 4.5:1 plus a little headroom for HSL rounding. */
const TEXT_TARGET = 4.6;

export type TeamChoice = string; // "LAL" | "LAL:alt"

export interface ParsedChoice { team: NbaTeam; alt: boolean }

/** True when the team's secondary can sensibly be a dominant colour (not white/near-white). */
export function canUseAlt(team: NbaTeam): boolean {
  return relativeLuminance(hexToRgb(team.secondary)) < 0.85;
}

export function parseTeamChoice(choice: string | null | undefined): ParsedChoice | null {
  if (!choice || typeof choice !== 'string' || choice.length > 8) return null;
  const [abbr, flag, ...rest] = choice.split(':');
  if (rest.length || (flag !== undefined && flag !== 'alt')) return null;
  const team = getTeam(abbr);
  if (!team || team.abbr !== abbr) return null;
  const alt = flag === 'alt';
  if (alt && !canUseAlt(team)) return null;
  return { team, alt };
}

export function isValidTeamChoice(choice: unknown): choice is TeamChoice {
  return typeof choice === 'string' && parseTeamChoice(choice) !== null;
}

/** All valid choice strings (for validation / tests). */
export function allTeamChoices(): TeamChoice[] {
  return NBA_TEAMS.flatMap((t) => (canUseAlt(t) ? [t.abbr, `${t.abbr}:alt`] : [t.abbr]));
}

/** Every variable a team theme may set (used to clear back to Benched default). */
export const TEAM_THEME_VAR_KEYS = [
  '--primary', '--primary-foreground', '--ring', '--accent', '--accent-foreground', '--primary-text',
  '--orange-50', '--orange-100', '--orange-200', '--orange-300', '--orange-400', '--orange-500',
  '--orange-600', '--orange-700', '--orange-800', '--orange-900', '--orange-950',
] as const;

export interface TeamThemeColors {
  dominant: RGB;
  other: RGB;
  foreground: RGB;
  text: RGB;
  accentBg: RGB;
  accentText: RGB;
  palette: Record<string, RGB>;
}

/** Colour for text-primary on white: dominant if readable, else the other team colour, else darkened dominant. */
export function textColourFor(dominant: RGB, other: RGB): RGB {
  if (contrastRatio(dominant, WHITE) >= TEXT_TARGET) return dominant;
  if (saturation(other) > 0.15 && contrastRatio(other, WHITE) >= TEXT_TARGET) return other;
  return darkenToContrast(dominant, TEXT_TARGET);
}

export function computeTeamColors(choice: string): TeamThemeColors | null {
  const parsed = parseTeamChoice(choice);
  if (!parsed) return null;
  const p = hexToRgb(parsed.team.primary);
  const s = hexToRgb(parsed.team.secondary);
  // Mid-tones (e.g. Hawks red) can't reach 4.5:1 with white or black text, so
  // deepen them just enough for white button text to pass.
  let dominant = parsed.alt ? s : p;
  if (Math.max(contrastRatio(dominant, WHITE), contrastRatio(dominant, INK)) < TEXT_TARGET) {
    dominant = darkenToContrast(dominant, TEXT_TARGET);
  }
  const other = parsed.alt ? p : s;
  const text = textColourFor(dominant, other);
  const accentBg = mix(dominant, WHITE, 0.92);
  const accentText = darkenToContrast(text, TEXT_TARGET, accentBg);

  const light: Record<string, number> = { 50: 0.95, 100: 0.88, 200: 0.74, 300: 0.58, 400: 0.3 };
  const dark: Record<string, [number, number]> = {
    600: [0.12, 3], 700: [0.25, TEXT_TARGET], 800: [0.4, TEXT_TARGET], 900: [0.55, TEXT_TARGET], 950: [0.7, TEXT_TARGET],
  };
  const palette: Record<string, RGB> = { 500: dominant };
  for (const [k, w] of Object.entries(light)) palette[k] = mix(dominant, WHITE, w);
  for (const [k, [w, target]] of Object.entries(dark)) {
    palette[k] = darkenToContrast(mix(dominant, [0, 0, 0], w), target);
  }
  return { dominant, other, foreground: readableForeground(dominant), text, accentBg, accentText, palette };
}

/** CSS custom properties for a choice, or null for an invalid choice. */
export function buildTeamThemeVars(choice: string): Record<string, string> | null {
  const c = computeTeamColors(choice);
  if (!c) return null;
  const vars: Record<string, string> = {
    '--primary': rgbToHslTriplet(c.dominant),
    '--primary-foreground': rgbToHslTriplet(c.foreground),
    '--ring': rgbToHslTriplet(c.dominant),
    '--accent': rgbToHslTriplet(c.accentBg),
    '--accent-foreground': rgbToHslTriplet(c.accentText),
    '--primary-text': rgbToHslTriplet(c.text),
  };
  for (const [k, v] of Object.entries(c.palette)) vars[`--orange-${k}`] = rgbTriplet(v);
  return vars;
}

/** Only these characters may appear in a cached variable value applied pre-paint. */
export const SAFE_VAR_VALUE = /^[0-9 .%]{1,40}$/;

/**
 * Inline <head> script: applies the cached theme before first paint so there is
 * no flash of Benched orange. Kept tiny and dependency-free; values are
 * re-validated (key whitelist prefix + numeric value pattern).
 */
export const TEAM_THEME_BOOT_SCRIPT = `(function(){try{var s=localStorage.getItem(${JSON.stringify(TEAM_THEME_STORAGE_KEY)});if(!s)return;var t=JSON.parse(s);if(!t||typeof t.k!=='string'||!t.v)return;var d=document.documentElement,ok=/^[0-9 .%]{1,40}$/;for(var k in t.v){if(/^--(primary|ring|accent|orange)[a-z0-9-]*$/.test(k)&&ok.test(t.v[k]))d.style.setProperty(k,t.v[k]);}d.setAttribute('data-team',t.k.replace(/[^A-Za-z:]/g,''));}catch(e){}})();`;
