import { describe, it, expect } from 'vitest';
import { resolveSiteLogos, BENCHED_LOGO_BLACK, BENCHED_LOGO_WHITE } from './logos';

describe('resolveSiteLogos', () => {
  it('uses the black wordmark on light backgrounds and the white wordmark in dark mode', () => {
    expect(resolveSiteLogos(undefined, undefined)).toEqual({ light: BENCHED_LOGO_BLACK, dark: BENCHED_LOGO_WHITE });
    expect(resolveSiteLogos('/benchedlogo.png', '/benchedlogo.png')).toEqual({ light: BENCHED_LOGO_BLACK, dark: BENCHED_LOGO_WHITE });
  });

  it('leaves a custom uploaded logo unchanged', () => {
    expect(resolveSiteLogos('/uploads/custom.png', '/uploads/custom-dark.png')).toEqual({
      light: '/uploads/custom.png',
      dark: '/uploads/custom-dark.png',
    });
  });
});
