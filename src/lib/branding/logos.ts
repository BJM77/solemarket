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
