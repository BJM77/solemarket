import { describe, it, expect } from 'vitest';
import { DEFAULT_SITE_CONFIG, mergeSiteConfig, safeColor, siteConfigCss } from './site-config';

describe('site config', () => {
  it('fills new sections into old documents', () => {
    const c = mergeSiteConfig({ branding: { ...DEFAULT_SITE_CONFIG.branding, primaryColor: '#123456' } } as any);
    expect(c.branding.primaryColor).toBe('#123456');
    expect(c.footer.columns.length).toBeGreaterThan(0);
    expect(c.categoryHeaders.cards.title).toBe('All Collector Cards');
    expect(c.announcement.enabled).toBe(false);
  });

  it('accepts hex/HSL colours and rejects injection', () => {
    expect(safeColor('#f26c0d')).toBe('#f26c0d');
    expect(safeColor('25 90% 50%')).toBe('25 90% 50%');
    expect(safeColor('red;}</style><script>')).toBeUndefined();
  });

  it('renders SSR CSS variables and fonts', () => {
    const css = siteConfigCss(mergeSiteConfig({ fonts: { body: 'Inter', heading: 'Montserrat' } } as any));
    expect(css).toContain('--primary:221 83% 53%');
    expect(css).toContain('--font-body:var(--font-inter)');
    expect(css).toContain('h1,h2,h3,h4{font-family:var(--font-heading)');
    expect(css).not.toContain('<');
  });
});
