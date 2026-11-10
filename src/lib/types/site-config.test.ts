import { describe, it, expect } from 'vitest';
import { DEFAULT_SITE_CONFIG, mergeSiteConfig, safeColor, siteConfigCss } from './site-config';

describe('site config', () => {
  it('fills new sections into old documents', () => {
    const c = mergeSiteConfig({ branding: { ...DEFAULT_SITE_CONFIG.branding, primaryColor: '#123456' } } as any);
    expect(c.branding.primaryColor).toBe('#123456');
    expect(c.footer.columns.length).toBeGreaterThan(0);
    expect(c.categoryHeaders.cards.title).toBe('Basketball Cards');
    expect(c.announcement.enabled).toBe(false);
  });

  it('accepts hex/HSL colours and rejects injection', () => {
    expect(safeColor('#f26c0d')).toBe('#f26c0d');
    expect(safeColor('25 90% 50%')).toBe('25 90% 50%');
    expect(safeColor('red;}</style><script>')).toBeUndefined();
  });

  it('renders SSR CSS variables and fonts', () => {
    const css = siteConfigCss(mergeSiteConfig({ fonts: { body: 'Inter', heading: 'Montserrat' } } as any));
    expect(css).toContain('--primary:25 89% 50%');
    expect(css).toContain('--font-body:var(--font-inter)');
    expect(css).toContain('h1,h2,h3,h4{font-family:var(--font-heading)');
    expect(css).not.toContain('<');
  });
});

describe('coins are off benched.au', () => {
  it('has no coins link in the default menus or footer', () => {
    const hrefs = [
      ...DEFAULT_SITE_CONFIG.menus.flatMap((m) => [m.href, ...(m.subItems || []).map((s) => s.href)]),
      ...DEFAULT_SITE_CONFIG.footer.columns.flatMap((c) => c.links.map((l) => l.href)),
    ];
    expect(hrefs.some((h) => h.startsWith('/coins'))).toBe(false);
    const also = DEFAULT_SITE_CONFIG.footer.columns.find((c) => c.title === 'Also on Benched');
    expect(also?.links.map((l) => l.label)).toContain('Pokémon');
  });

  it('strips coins links from saved settings', () => {
    const c = mergeSiteConfig({
      menus: [
        { id: 'a', label: 'Coins', href: '/coins', enabled: true, order: 1 },
        { id: 'b', label: 'More', href: '#', enabled: true, order: 2, subItems: [{ label: 'Gold', href: '/coins?subCategory=Gold' }, { label: 'WTB', href: '/wtb' }] },
      ],
      footer: { ...DEFAULT_SITE_CONFIG.footer, columns: [{ id: 'f5', title: 'Also on Benched', links: [{ label: 'Coins & Bullion', href: '/coins' }, { label: 'Pokémon', href: '/pokemon' }] }] },
      hero: { ...DEFAULT_SITE_CONFIG.hero, buttons: [{ id: '1', label: 'Shop Coins', href: '/coins', bgColor: '#000', textColor: '#fff' }, { id: '2', label: 'Shop Cards', href: '/cards', bgColor: '#000', textColor: '#fff' }] },
    } as any);
    expect(c.menus.map((m) => m.label)).toEqual(['More']);
    expect(c.menus[0].subItems?.map((s) => s.label)).toEqual(['WTB']);
    expect(c.footer.columns[0].links.map((l) => l.label)).toEqual(['Pokémon']);
    expect(c.hero.buttons.map((b) => b.label)).toEqual(['Shop Cards']);
  });
});
