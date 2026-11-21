import { test, expect } from '@playwright/test';
import { flowsEnabled } from './helpers';

// The emulators are seeded before the build, so the homepage has real listing tiles.
// Excludes the header ticker: it links listings too, but it never stops moving.
const homepageTile = 'a[href*="/cards/"]:not([data-testid="market-ticker"] a), a[href*="/shoes/"]:not([data-testid="market-ticker"] a)';

test.describe('homepage with seeded listings', () => {
  test.skip(!flowsEnabled, 'needs E2E_EMULATORS=true and seeded emulators');

  test('the ticker shows real listings without page errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.goto('/');
    const ticker = page.getByTestId('market-ticker');
    await expect(ticker).toBeVisible({ timeout: 20_000 });
    await expect(ticker.getByRole('link').first()).toBeAttached({ timeout: 20_000 });
    expect(errors).toEqual([]);
  });

  test('listing links land at the top, and Back restores scroll', async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const tile = page.locator(homepageTile).filter({ visible: true }).first();
    await expect(tile).toBeVisible({ timeout: 30_000 });

    // Scroll down, then pick a tile that is already on screen so the click doesn't scroll the page.
    await page.evaluate(() => window.scrollTo(0, 1200));
    const homeScroll = await page.evaluate(() => window.scrollY);
    expect(homeScroll).toBeGreaterThan(400);
    const marked = await page.evaluate((selector) => {
      const onScreen = [...document.querySelectorAll<HTMLAnchorElement>(selector)].find((a) => {
        const r = a.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && r.top >= 80 && r.bottom <= window.innerHeight;
      });
      onScreen?.setAttribute('data-e2e-scroll-tile', '1');
      return !!onScreen;
    }, homepageTile);
    expect(marked, 'a listing tile is visible around 1200px down the homepage').toBe(true);

    await page.locator('[data-e2e-scroll-tile]').click();
    await page.waitForURL((url) => /\/(cards|shoes|product)\//.test(url.pathname), { timeout: 30_000 });
    await expect.poll(() => page.evaluate(() => window.scrollY), { timeout: 10_000 }).toBeLessThan(40);

    await page.goBack();
    await page.waitForURL((url) => url.pathname === '/', { timeout: 30_000 });
    await expect.poll(() => page.evaluate(() => window.scrollY), { timeout: 10_000 }).toBeGreaterThan(400);
  });
});
