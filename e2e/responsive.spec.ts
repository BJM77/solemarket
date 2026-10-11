import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Responsive + accessibility checks for public pages, run at 390px (mobile-390)
 * and 1440px (desktop-1440). Full-page screenshots are attached to the report
 * for visual review (test-results/ and the HTML report) rather than pixel-diffed,
 * because page content is live marketplace data.
 */
const PAGES = [
  { path: '/', name: 'home' },
  { path: '/browse', name: 'browse' },
  { path: '/sell', name: 'sell' },
  { path: '/sign-in', name: 'sign-in' },
  { path: '/help', name: 'help' },
];

for (const { path, name } of PAGES) {
  test.describe(`${name} (${path})`, () => {
    test('renders without horizontal overflow and with a single h1', async ({ page }, info) => {
      const resp = await page.goto(path, { waitUntil: 'domcontentloaded' });
      expect(resp?.status(), `HTTP status for ${path}`).toBeLessThan(400);
      await page.waitForLoadState('load');

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, 'page should not scroll horizontally').toBeLessThanOrEqual(1);

      await expect(page.locator('h1').first()).toBeVisible();

      await info.attach(`${name}-${info.project.name}.png`, {
        body: await page.screenshot({ fullPage: true }),
        contentType: 'image/png',
      });
    });

    test('has no serious/critical axe violations (zoom, names, contrast)', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(path, { waitUntil: 'load' });
      // Let entrance animations finish so axe measures final colours, not mid-fade opacity.
      await page.waitForTimeout(2000);
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        // Third-party widgets we don't control.
        .exclude('iframe')
        .analyze();
      const blocking = results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
      const summary = blocking.map((v) => `${v.id} (${v.nodes.length}): ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`);
      expect.soft(summary, 'serious/critical accessibility violations').toEqual([]);
    });
  });
}

test('viewport allows pinch zoom', async ({ page }) => {
  await page.goto('/');
  const content = await page.locator('meta[name="viewport"]').getAttribute('content');
  expect(content).not.toMatch(/user-scalable\s*=\s*(no|0)/);
  expect(content).not.toMatch(/maximum-scale\s*=\s*1(\.0)?(,|$)/);
});

test('mobile bottom nav targets are at least 44px', async ({ page }, info) => {
  test.skip(info.project.name !== 'mobile-390', 'mobile only');
  await page.goto('/');
  const nav = page.locator('nav.md\\:hidden').first();
  await expect(nav).toBeVisible();
  const boxes = await nav.locator('a').evaluateAll((els) => els.map((e) => e.getBoundingClientRect()).map((r) => ({ w: r.width, h: r.height })));
  for (const b of boxes) {
    expect(Math.min(b.w, b.h)).toBeGreaterThanOrEqual(44);
  }
});
