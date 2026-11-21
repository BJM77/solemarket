import { describe, it, expect } from 'vitest';
import { resolveSiteLogos, logoRenderPlan, BENCHED_LOGO_BLACK, BENCHED_LOGO_WHITE } from './logos';

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

describe('logoRenderPlan', () => {
  it('draws the default wordmark from one black asset, inverted in dark mode', () => {
    expect(logoRenderPlan(undefined, undefined)).toEqual({ kind: 'single', src: BENCHED_LOGO_BLACK, invertInDark: true });
    expect(logoRenderPlan('/benchedlogo.png', '/benched-logo-white.png')).toEqual({ kind: 'single', src: BENCHED_LOGO_BLACK, invertInDark: true });
    expect(logoRenderPlan(BENCHED_LOGO_BLACK, BENCHED_LOGO_WHITE)).toEqual({ kind: 'single', src: BENCHED_LOGO_BLACK, invertInDark: true });
  });

  it('keeps a single custom logo as-is, without inverting it', () => {
    expect(logoRenderPlan('/uploads/custom.png', undefined)).toEqual({ kind: 'single', src: '/uploads/custom.png', invertInDark: false });
  });

  it('keeps a custom light/dark pair', () => {
    expect(logoRenderPlan('/uploads/custom.png', '/uploads/custom-dark.png')).toEqual({
      kind: 'pair',
      light: '/uploads/custom.png',
      dark: '/uploads/custom-dark.png',
    });
  });
});
