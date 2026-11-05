import { test, expect } from '@playwright/test';
import { flowsEnabled, signIn, resetDrafts, productStatus } from './helpers';

test.describe('bulk draft review → background publish', () => {
  // Production CSP only allows Google endpoints; the emulators live on 127.0.0.1.
  test.use({ bypassCSP: true });
  test.skip(!flowsEnabled, 'needs E2E_EMULATORS=true and seeded emulators');

  // Each attempt (incl. CI retries) starts from fresh drafts; a prior attempt may have published them.
  test.beforeEach(async () => { await resetDrafts(); });

  test('seller publishes all drafts as a background job', async ({ page }) => {
    test.setTimeout(150_000);
    await signIn(page, 'seller@e2e.test');
    // The review grid reopens drafts remembered on this device.
    await page.evaluate(() => localStorage.setItem('benched:bulk-drafts', JSON.stringify(['e2e-draft-1', 'e2e-draft-2', 'e2e-draft-3'])));
    await page.goto('/sell/drafts-review');

    const grid = page.getByTestId('draft-review-grid');
    await expect(grid).toBeVisible({ timeout: 30_000 });
    await expect(grid.locator('input[aria-label="Title"]')).toHaveCount(3, { timeout: 30_000 });

    await grid.getByTestId('publish-all-background-btn').click();

    // Job finishes server-side and the grid empties.
    await expect(page.getByText(/No Fast Bulk or Autofast drafts/i)).toBeVisible({ timeout: 90_000 });

    // Confirm the background job actually published all drafts in Firestore before visiting one.
    for (const id of ['e2e-draft-1', 'e2e-draft-2', 'e2e-draft-3']) {
      await expect.poll(() => productStatus(id), { timeout: 30_000 }).toBe('available');
    }
    await page.goto('/product/e2e-draft-2');
    await expect(page.getByRole('heading', { name: /E2E Draft Card 2/i }).first()).toBeVisible({ timeout: 30_000 });
  });
});
