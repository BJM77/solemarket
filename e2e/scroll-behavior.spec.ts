import { test, expect } from '@playwright/test';

// Replaces a unit test that regex-matched globals.css and layout.tsx: check what the browser actually does.
test('the page scrolls instantly for navigation, and only one element scrolls', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const styles = await page.evaluate(() => {
    const html = getComputedStyle(document.documentElement);
    const body = getComputedStyle(document.body);
    return {
      htmlScroll: html.scrollBehavior,
      bodyScroll: body.scrollBehavior,
      dataScroll: document.documentElement.getAttribute('data-scroll-behavior'),
      htmlOverflowX: html.overflowX,
      bodyOverflowX: body.overflowX,
    };
  });
  // CSS smooth scrolling on html/body breaks Next.js scroll-to-top on navigation.
  expect(styles.htmlScroll).not.toBe('smooth');
  expect(styles.bodyScroll).not.toBe('smooth');
  // Next.js reads this attribute to keep smooth scrolling for in-page hash links only.
  expect(styles.dataScroll).toBe('smooth');
  // overflow-x: hidden/auto on html or body makes a second scroll container, so window.scrollTo(0) may not move the page.
  expect(['hidden', 'auto', 'scroll']).not.toContain(styles.htmlOverflowX);
  expect(['hidden', 'auto', 'scroll']).not.toContain(styles.bodyOverflowX);

  // And scrolling the window really moves the page.
  await page.evaluate(() => window.scrollTo(0, 600));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(300);
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
});
