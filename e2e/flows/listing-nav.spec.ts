import { test, expect } from '@playwright/test';
import { flowsEnabled, seedNavListings } from './helpers';

const idFrom = (url: string) => new URL(url).pathname.split('/').filter(Boolean).pop()!;

// Next steps through every listing matching the browse filters, then the rest, with no repeats.
test.describe('listing Previous/Next sequence', () => {
  test.use({ bypassCSP: true, viewport: { width: 1280, height: 900 } });
  test.skip(!flowsEnabled, 'needs E2E_EMULATORS=true and seeded emulators');

  test('filtered listings first, then the remainder, never twice, then a friendly end', async ({ page }) => {
    test.setTimeout(180_000);
    await seedNavListings();
    // A filtered URL makes the grid fetch live (not the build-time first page).
    await page.goto('/shoes?brand=E2ENav');
    const first = page.locator('a[href$="/e2e-nav-a"]').first();
    await expect(first).toBeVisible({ timeout: 45_000 });
    await expect(page.locator('a[href$="/e2e-nav-c"]').first()).toBeVisible();
    await first.click();
    await expect(page).toHaveURL(/\/e2e-nav-a$/, { timeout: 45_000 });

    const seen: string[] = ['e2e-nav-a'];
    const next = page.getByTestId('listing-nav-next');
    for (let step = 0; step < 40; step++) {
      // Wait until Next is a link (more listings) or the end button.
      await expect(async () => {
        const isEnd = (await next.getAttribute('data-end')) === 'true';
        const href = await next.getAttribute('href');
        expect(isEnd || !!href).toBe(true);
      }).toPass({ timeout: 30_000 });
      if ((await next.getAttribute('data-end')) === 'true') break;
      const before = page.url();
      await next.click();
      await expect(page).not.toHaveURL(before, { timeout: 30_000 });
      seen.push(idFrom(page.url()));
    }

    expect(seen.slice(0, 3)).toEqual(['e2e-nav-a', 'e2e-nav-b', 'e2e-nav-c']);
    expect(seen).toContain('e2e-nav-other');
    expect(seen.indexOf('e2e-nav-other')).toBeGreaterThan(2);
    expect(new Set(seen).size).toBe(seen.length);
    // Pokémon listings stay out of main-site sequences.
    expect(seen).not.toContain('e2e-live-1');
    expect(seen).not.toContain('e2e-guest-1');

    await next.click();
    const end = page.getByTestId('listing-sequence-end');
    await expect(end).toContainText(/seen every listing/i);
    await expect(end.getByRole('link', { name: /back to browse/i })).toHaveAttribute('href', '/shoes?brand=E2ENav');

    // Previous walks back through what was seen.
    await page.getByTestId('listing-nav-prev').click();
    await expect(page).toHaveURL(new RegExp(`/${seen[seen.length - 2]}$`), { timeout: 30_000 });
  });
});
