import { test, expect } from '@playwright/test';

// Needs live listings so a homepage tile exists. Run with
// E2E_LIVE_DATA=1 PLAYWRIGHT_BASE_URL=https://benched.au
test('listing links from the homepage land at the top, and Back restores scroll', async ({ page }) => {
  test.skip(!process.env.E2E_LIVE_DATA, 'needs live listings (set E2E_LIVE_DATA=1)');
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const tile = page.locator('a[href*="/cards/"], a[href*="/shoes/"]').filter({ visible: true }).first();
  await expect(tile).toBeVisible({ timeout: 20_000 });
  await page.evaluate(() => window.scrollTo(0, 1200));
  const homeScroll = await page.evaluate(() => window.scrollY);
  expect(homeScroll).toBeGreaterThan(400);
  await tile.click();
  await page.waitForURL(/\/(cards|shoes|product)\//, { timeout: 20_000 });
  await expect.poll(async () => page.evaluate(() => window.scrollY), { timeout: 8_000 }).toBeLessThan(40);
  await page.goBack();
  await page.waitForURL('**/', { timeout: 20_000 });
  await expect.poll(async () => page.evaluate(() => window.scrollY), { timeout: 8_000 }).toBeGreaterThan(400);
});
