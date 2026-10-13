import { test, expect } from '@playwright/test';

test('sitemap index is served at /sitemap.xml', async ({ request }) => {
  const res = await request.get('/sitemap.xml');
  expect(res.status()).toBe(200);
  expect(res.headers()['content-type']).toContain('xml');
  expect(await res.text()).toContain('<sitemapindex');
});

for (const [path, title] of [['/shoes', /Sneakers/], ['/help', /Help Centre/], ['/terms', /Terms of Service/], ['/contact', /Contact Us/]] as const) {
  test(`${path} has its own title without a doubled brand`, async ({ page }) => {
    await page.goto(path, { waitUntil: 'domcontentloaded' });
    const t = await page.title();
    expect(t).toMatch(title);
    expect(t).not.toMatch(/Benched.*\|.*Benched/);
    expect(t).not.toMatch(/Sneakers Sneakers/);
  });
}

test('auth pages and 404 are noindex', async ({ page }) => {
  for (const p of ['/log', '/sign-up', '/this-page-does-not-exist']) {
    await page.goto(p, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('meta[name="robots"]').last()).toHaveAttribute('content', /noindex/);
  }
});

test('search action points at a real route and no placeholder phone', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const ld = await page.locator('script[type="application/ld+json"]').allTextContents();
  const all = ld.join('\n');
  expect(all).toContain('/browse?q={search_term_string}');
  expect(all).not.toContain('+61400000000');
  expect(all).not.toMatch(/benched\.auhttps/);
});

test('/sell/guide redirects to the public seller page', async ({ page }) => {
  await page.goto('/sell/guide');
  await expect(page).toHaveURL(/\/sell\/?$/);
});
