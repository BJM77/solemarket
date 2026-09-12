import { test, expect } from '@playwright/test';

test.describe('Marketplace Core Flows', () => {
  test('should load the homepage and display categories', async ({ page }) => {
    await page.goto('/');
    
    // Check if the main heading or a specific element is visible
    await expect(page.locator('text=Sneakers').first()).toBeVisible();
    await expect(page.locator('text=Collector Cards').first()).toBeVisible();
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
