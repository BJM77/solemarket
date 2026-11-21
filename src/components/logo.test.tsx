import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';

let branding: { siteLogoUrl?: string; logoDarkUrl?: string } = {};
vi.mock('@/providers/SiteConfigProvider', () => ({ useSiteConfig: () => ({ config: { branding } }) }));

import { Logo } from './logo';

describe('Logo', () => {
  it('renders the default wordmark once (one download), recoloured for dark mode', () => {
    branding = {};
    const { container } = render(<Logo priority />);
    const imgs = container.querySelectorAll('img');
    expect(imgs).toHaveLength(1);
    expect(imgs[0].getAttribute('src')).toContain('benched-logo-black.png');
    expect(imgs[0].className).toContain('dark:invert');
    // Priority images load eagerly (and are preloaded); others are lazy.
    expect(imgs[0].getAttribute('loading')).not.toBe('lazy');
  });

  it('only preloads the light version of a custom light/dark pair', () => {
    branding = { siteLogoUrl: '/uploads/custom.png', logoDarkUrl: '/uploads/custom-dark.png' };
    const { container } = render(<Logo priority />);
    const imgs = Array.from(container.querySelectorAll('img'));
    expect(imgs).toHaveLength(2);
    expect(imgs[0].getAttribute('loading')).not.toBe('lazy');
    expect(imgs[1].getAttribute('loading')).toBe('lazy');
  });
});
