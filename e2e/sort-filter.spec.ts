import { test, expect } from '@playwright/test';

const prices = async (page: import('@playwright/test').Page) =>
  (await page.locator('[data-testid="product-price"]').allTextContents())
    .map((t) => parseFloat(t.replace(/[^0-9.]/g, '')))
    .filter((n) => !Number.isNaN(n));

test('price low-high sort renders ascending prices', async ({ page }) => {
  await page.goto('/category/sneakers?sort=price-asc');
  const p = await prices(page);
  test.skip(p.length < 2, 'not enough live listings');
  expect(p).toEqual([...p].sort((a, b) => a - b));
});

test('mobile filter drawer contains filters and an apply button', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/category/sneakers');
  await page.getByTestId('mobile-filters-trigger').click();
  const sheet = page.getByTestId('mobile-filter-sheet');
  await expect(sheet.getByTestId('filter-panel-inline')).toBeVisible();
  await expect(sheet.getByTestId('filter-apply')).toBeVisible();
});

test('clear all keeps the category and drops filters', async ({ page }) => {
  await page.goto('/category/sneakers?sizes=10&priceRange=100,300');
  await page.getByTestId('clear-all-filters').click();
  await expect(page).toHaveURL(/\/category\/sneakers(\?view=[^&]+)?$/);
  await expect(page.getByTestId('active-filters')).toHaveCount(0);
});

test('brand pages expose a sort control', async ({ page }) => {
  await page.goto('/brand/nike');
  await expect(page.getByRole('combobox').first()).toBeVisible();
});
