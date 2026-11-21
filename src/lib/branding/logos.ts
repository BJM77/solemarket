export const BENCHED_LOGO_BLACK = '/benched-logo-black.png';
export const BENCHED_LOGO_WHITE = '/benched-logo-white.png';

/** The original orange wordmark; treated as the default so we can swap in monochrome assets. */
const DEFAULT_ORANGE_LOGO = '/benchedlogo.png';

export function isDefaultOrangeLogo(url?: string | null): boolean {
  if (!url) return true;
  const path = url.split('?')[0];
  return path === DEFAULT_ORANGE_LOGO || path.endsWith(DEFAULT_ORANGE_LOGO);
}

/** Light-background (black) and dark-background (white) wordmarks. Custom uploads are left as-is. */
export function resolveSiteLogos(siteLogoUrl?: string | null, logoDarkUrl?: string | null): { light: string; dark: string } {
  if (isDefaultOrangeLogo(siteLogoUrl)) {
    return { light: BENCHED_LOGO_BLACK, dark: BENCHED_LOGO_WHITE };
  }
  const dark = logoDarkUrl && !isDefaultOrangeLogo(logoDarkUrl) ? logoDarkUrl : siteLogoUrl!;
  return { light: siteLogoUrl!, dark };
}

export type LogoRenderPlan =
  /** One image. `invertInDark` turns the black wordmark white on dark backgrounds. */
  | { kind: 'single'; src: string; invertInDark: boolean }
  /** A custom upload with a separate dark version: both rendered, only the light one preloaded. */
  | { kind: 'pair'; light: string; dark: string };

/**
 * How to draw the logo with as few downloads as possible. The default Benched
 * wordmark is pure black on transparent, so the white version is the same
 * image inverted: one asset, one preload, and CSS recolours it in dark mode.
 */
export function logoRenderPlan(siteLogoUrl?: string | null, logoDarkUrl?: string | null): LogoRenderPlan {
  const { light, dark } = resolveSiteLogos(siteLogoUrl, logoDarkUrl);
  if (light === BENCHED_LOGO_BLACK && (dark === BENCHED_LOGO_WHITE || dark === BENCHED_LOGO_BLACK)) {
    return { kind: 'single', src: BENCHED_LOGO_BLACK, invertInDark: true };
  }
  if (light === dark) return { kind: 'single', src: light, invertInDark: false };
  return { kind: 'pair', light, dark };
}
