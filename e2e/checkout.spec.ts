import { test, expect } from '@playwright/test';

test.describe('Marketplace Core Flows', () => {
  test('should load the homepage and display categories', async ({ page }) => {
    await page.goto('/');
    
    // Check if the main heading or a specific element is visible
    const nav = page.getByRole('navigation', { name: 'Main' });
    await expect(nav.getByRole('link', { name: 'Shoes' })).toBeVisible({ timeout: 15000 });
    await expect(nav.getByRole('link', { name: 'Cards' })).toBeVisible();
  });

  // Example of a stubbed checkout test
  // test('should add item to cart and proceed to checkout', async ({ page }) => {
  //   await page.goto('/shoes');
  //   await page.click('text=Add to Cart');
  //   await page.click('[aria-label="Open cart"]');
  //   await expect(page.locator('text=DealSafe Escrow')).toBeVisible();
  //   await page.click('text=Checkout');
  //   await expect(page).toHaveURL(/.*\/checkout/);
  // });
});
