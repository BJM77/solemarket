import { test, expect } from '@playwright/test';
import { flowsEnabled } from './helpers';

// The emulators are seeded before the build, so the homepage has real listing tiles.
// Excludes the header ticker: it links listings too, but it never stops moving.
const homepageTile =
  'main a[href*="/cards/"]:not([data-testid="market-ticker"] a), main a[href*="/shoes/"]:not([data-testid="market-ticker"] a)';

test.describe('homepage listing links (seeded emulators)', () => {
  test.use({ viewport: { width: 1280, height: 800 } });
  test.skip(!flowsEnabled, 'needs E2E_EMULATORS=true and seeded emulators');

  test('a listing link lands at the top, and Back restores the homepage scroll', async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator(homepageTile).filter({ visible: true }).first()).toBeVisible({ timeout: 30_000 });

    // Scroll so the lowest visible tile sits mid-screen, then mark it: the click then needs no scrolling.
    const homeScroll = await page.evaluate((selector) => {
      const tiles = [...document.querySelectorAll<HTMLAnchorElement>(selector)].filter((a) => {
        const r = a.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      });
      const last = tiles.reduce((a, b) =>
        b.getBoundingClientRect().top > a.getBoundingClientRect().top ? b : a);
      window.scrollTo(0, last.getBoundingClientRect().top + window.scrollY - window.innerHeight / 3);
      last.setAttribute('data-e2e-scroll-tile', '1');
      return window.scrollY;
    }, homepageTile);
    expect(homeScroll, 'the homepage is tall enough to scroll to a lower tile').toBeGreaterThan(300);

    await page.locator('[data-e2e-scroll-tile]').click();
    await page.waitForURL((url) => /^\/(cards|shoes|product)\//.test(url.pathname), { timeout: 30_000 });
    await expect.poll(() => page.evaluate(() => window.scrollY), { timeout: 10_000 }).toBeLessThan(40);

    await page.goBack();
    await page.waitForURL((url) => url.pathname === '/', { timeout: 30_000 });
    await expect
      .poll(async () => Math.abs((await page.evaluate(() => window.scrollY)) - homeScroll), { timeout: 10_000 })
      .toBeLessThan(120);
  });
});
