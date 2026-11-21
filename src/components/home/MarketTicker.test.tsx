import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { contrastRatio, hexToRgb, type RGB } from '@/lib/team-themes/color';
import { allTeamChoices, buildTeamThemeVars } from '@/lib/team-themes/theme';
import { effectiveTextOpacity } from '@/test/tailwind-opacity';

let collection: { data: unknown[] | null; isLoading: boolean; error: Error | null } = { data: [], isLoading: false, error: null };
vi.mock('@/firebase', () => ({ useFirebaseRef: () => null, useCollection: () => collection }));
vi.mock('@/context/MobileNavContext', () => ({ useMobileNav: () => ({ isPinned: false }) }));
vi.mock('next/link', () => ({ default: ({ href, children, ...rest }: any) => <a href={href} {...rest}>{children}</a> }));

import { MarketTicker } from './MarketTicker';

/** Benched orange and ink from globals.css (:root --primary / --primary-foreground). */
const THEMES: [string, RGB, RGB][] = [['benched', hexToRgb('#f26c0d'), hexToRgb('#111111')]];

function hslTripletToRgb(t: string): RGB {
  const [h, s, l] = t.replace(/%/g, '').split(' ').map(Number);
  const sn = s / 100, ln = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sn * Math.min(ln, 1 - ln);
  const f = (n: number) => ln - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}
for (const choice of allTeamChoices()) {
  const vars = buildTeamThemeVars(choice)!;
  THEMES.push([choice, hslTripletToRgb(vars['--primary']), hslTripletToRgb(vars['--primary-foreground'])]);
}

const blend = (fg: RGB, bg: RGB, a: number): RGB => [0, 1, 2].map((i) => Math.round(fg[i] * a + bg[i] * (1 - a))) as RGB;

/** Text drawn in --primary-foreground on the --primary bar must reach WCAG AA (4.5:1) on every theme. */
function expectReadableOnEveryTheme(opacity: number, label: string) {
  for (const [name, bg, fg] of THEMES) {
    expect(contrastRatio(bg, blend(fg, bg, opacity)), `${label} on ${name}`).toBeGreaterThanOrEqual(4.5);
  }
}

const product = (i: number) => ({ id: `p${i}`, title: `Card ${i}`, price: 10 + i, category: 'Collector Cards', status: 'available' });

describe('MarketTicker (rendered)', () => {
  beforeEach(() => { collection = { data: [], isLoading: false, error: null }; });

  it('waiting state: the message is on the team-coloured bar and readable on every theme', () => {
    const { container } = render(<MarketTicker />);
    const message = screen.getByText(/Waiting for active listings/i);
    const bar = container.firstElementChild!;
    expect(bar.className).toMatch(/\bbg-primary\b/);
    expect(bar.className).toMatch(/\btext-primary-foreground\b/);
    expectReadableOnEveryTheme(effectiveTextOpacity(message), 'waiting text');
    expectReadableOnEveryTheme(effectiveTextOpacity(message, 'hover'), 'waiting text (hover)');
  });

  it('listing items: titles and prices stay readable normally and on hover', () => {
    collection = { data: [1, 2, 3, 4, 5, 6].map(product), isLoading: false, error: null };
    render(<MarketTicker />);
    const links = screen.getAllByRole('link');
    expect(links.length).toBeGreaterThan(0);
    const title = screen.getAllByText('Card 1')[0];
    expectReadableOnEveryTheme(effectiveTextOpacity(title), 'item title');
    expectReadableOnEveryTheme(effectiveTextOpacity(title, 'hover'), 'item title (hover)');
    expect(links[0].getAttribute('href')).toContain('card-1');
  });

  it('the contrast check would catch a faded variant', () => {
    const faded = document.createElement('p');
    faded.className = 'opacity-40 hover:text-primary-foreground/80';
    expect(effectiveTextOpacity(faded)).toBeCloseTo(0.4);
    expect(effectiveTextOpacity(faded, 'hover')).toBeCloseTo(0.32);
    expect(THEMES.some(([, bg, fg]) => contrastRatio(bg, blend(fg, bg, 0.4)) < 4.5)).toBe(true);
  });
});
