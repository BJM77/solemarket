import { test, expect } from '@playwright/test';

test('published brand CSS variables are in the server-rendered HTML (no flash of defaults)', async ({ request }) => {
  const html = await (await request.get('/')).text();
  expect(html).toMatch(/<style id="site-config-vars">[^<]*--primary:/);
  expect(html).toContain('--font-body:');
});

test('footer renders configured columns server-side', async ({ request }) => {
  const html = await (await request.get('/about')).text();
  expect(html).toMatch(/<footer[\s\S]*Marketplace[\s\S]*Support[\s\S]*<\/footer>/);
});

test('admin Brand Refresh is not public', async ({ page }) => {
  await page.goto('/admin/brand-refresh');
  await expect(page).not.toHaveURL(/\/admin\/brand-refresh$/);
});

test('draft preview link does not expose drafts to visitors', async ({ page }) => {
  await page.goto('/?sitePreview=draft', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await expect(page.getByTestId('draft-preview-badge')).toHaveCount(0);
});
