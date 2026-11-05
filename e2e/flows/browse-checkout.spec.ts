import { test, expect } from '@playwright/test';
import { flowsEnabled, signIn } from './helpers';

// Runs against the Firebase emulators seeded by e2e/flows/seed.mjs (CI job e2e-flows).
test.describe('browse → checkout (PayID / cash)', () => {
  // Production CSP only allows Google endpoints; the emulators live on 127.0.0.1.
  test.use({ bypassCSP: true });
  // Serial: the mobile Buy check must run before the purchase marks the listing sold.
  test.describe.configure({ mode: 'serial' });
  test.skip(!flowsEnabled, 'needs E2E_EMULATORS=true and seeded emulators');

  test.describe('mobile bottom nav', () => {
    test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

    test('signed-in non-owner sees Buy in the centre slot', async ({ page }) => {
      await signIn(page, 'buyer@e2e.test');
      await page.goto('/product/e2e-live-1');
      // Runs before the purchase test so the listing is still available; wait on the nav button itself.
      await expect(page.getByTestId('bottom-nav-buy')).toBeVisible({ timeout: 45_000 });
      await expect(page.getByTestId('bottom-nav-buy')).toBeEnabled();
      await expect(page.getByTestId('bottom-nav-prev')).toBeVisible();
    });
  });

  test('buyer finds a listing and places a cash-on-pickup order', async ({ page }) => {
    await signIn(page, 'buyer@e2e.test');

    // Browse: the seeded listing is reachable from its legacy alias (redirects to canonical URL).
    await page.goto('/product/e2e-live-1');
    await expect(page.getByRole('heading', { name: /E2E Charizard Test Card/i }).first()).toBeVisible({ timeout: 30_000 });

    await page.getByRole('button', { name: /buy now/i }).first().click();
    await expect(page).toHaveURL(/\/checkout/, { timeout: 30_000 });

    await page.locator('label[for="cash"]').click();
    const confirm = page.getByRole('button', { name: /confirm purchase/i });
    await expect(confirm).toBeDisabled();
    await page.locator('input[type="checkbox"][required]').first().check();
    await expect(confirm).toBeEnabled();
    await confirm.click();

    await expect(page).toHaveURL(/\/checkout\/confirmation/, { timeout: 45_000 });
  });

});
