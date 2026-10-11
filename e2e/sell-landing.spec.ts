import { test, expect } from '@playwright/test';

test('/sell is a public landing page (no sign-in redirect)', async ({ page }) => {
  await page.goto('/sell');
  await expect(page).toHaveURL(/\/sell\/?$/);
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /Sell/);
});

test('/sell/create still requires sign-in', async ({ page }) => {
  await page.goto('/sell/create');
  await expect(page).toHaveURL(/\/sign-in/);
});
