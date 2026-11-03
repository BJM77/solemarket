import { test, expect } from '@playwright/test';
import { flowsEnabled, signIn } from './helpers';

// Runs against the Firebase emulators seeded by e2e/flows/seed.mjs (CI job e2e-flows).
test.describe('browse → checkout (PayID / cash)', () => {
  // Production CSP only allows Google endpoints; the emulators live on 127.0.0.1.
  test.use({ bypassCSP: true });
  test.skip(!flowsEnabled, 'needs E2E_EMULATORS=true and seeded emulators');

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
