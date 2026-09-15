import { test, expect } from '@playwright/test';

test('homepage renders MarketTicker with real products', async ({ page }) => {
  await page.goto('/');
  
  // 1. No console errors during load
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));
  
  // 2. Critical element exists
  await expect(page.getByTestId('market-ticker')).toBeVisible({ timeout: 5000 });
  
  // 3. It contains at least one real product link
  const links = page.getByTestId('market-ticker').getByRole('link');
  await expect(links.first()).toBeVisible();
  
  // 4. No console errors
  expect(errors).toEqual([]);
});
