import { test, expect } from '@playwright/test';
import { flowsEnabled, seedTierListings } from './helpers';

// Runs against the Firebase emulators seeded by e2e/flows/seed.mjs (CI job e2e-flows).
test.describe('cart deal-fill suggestions', () => {
  test.use({ bypassCSP: true });
  test.skip(!flowsEnabled, 'needs E2E_EMULATORS=true and seeded emulators');

  test('cart link and row help fill a Bronze deal from the same seller', async ({ page }) => {
    await seedTierListings();
    await page.addInitScript(() => {
      if (sessionStorage.getItem('e2e-tier-cart-set')) return;
      sessionStorage.setItem('e2e-tier-cart-set', '1');
      localStorage.setItem('benched-cart', JSON.stringify([{
        id: 'e2e-bronze-1',
        title: 'E2E Bronze Card 1',
        price: 7,
        quantity: 1,
        sellerId: 'e2e-seller',
        sellerName: 'E2E Seller',
        imageUrls: ['/placeholder.png'],
        category: 'Collector Cards',
        multiCardTier: 'bronze',
        multibuyEnabled: true,
        status: 'available',
      }]));
      localStorage.setItem('benched-shipping-method', 'pickup');
    });

    await page.goto('/checkout');
    await expect(page.getByTestId('tier-nudges')).toBeVisible({ timeout: 45_000 });
    await expect(page.getByTestId('tier-nudge')).toContainText('Add 4 more Bronze cards');
    const link = page.getByTestId('tier-nudge-link');
    await expect(link).toHaveText(/See more Bronze cards from E2E Seller/);
    await expect(link).toHaveAttribute('href', /\/multibuy\?tier=bronze&seller=e2e-seller&group=cards/);

    const row = page.getByTestId('deal-suggestion-row');
    await expect(row).toBeVisible({ timeout: 45_000 });
    const cards = row.getByTestId('deal-suggestion-card');
    await expect(cards).toHaveCount(4);
    await expect(row).toContainText('E2E Bronze Card 2');
    await expect(row).not.toContainText('E2E Bronze Card 1');
    await expect(row).not.toContainText('E2E Gold Card 1');
    await expect(row).not.toContainText('E2E Other Seller Bronze');

    await row.getByTestId('deal-suggestion-add').first().click();
    await expect(page.getByTestId('tier-nudge')).toContainText('Add 3 more Bronze cards');
    await expect(cards).toHaveCount(3);

    await link.click();
    await expect(page).toHaveURL(/\/multibuy\?.*tier=bronze.*seller=e2e-seller/);
    await expect(page.getByTestId('multibuy-seller-filter')).toContainText(/deals from E2E Seller/);
    await expect(page.getByText('E2E Bronze Card 2')).toBeVisible({ timeout: 45_000 });
    await expect(page.getByText('E2E Gold Card 1')).toHaveCount(0);
    await expect(page.getByText('E2E Other Seller Bronze')).toHaveCount(0);

    await page.getByTestId('multibuy-seller-clear').click();
    await expect(page).toHaveURL(/\/multibuy\?/);
    await expect(page).not.toHaveURL(/seller=/);
    await expect(page.getByTestId('multibuy-seller-filter')).toHaveCount(0);
  });

  test('slide-out cart also shows the deal link and suggestion row', async ({ page }) => {
    await seedTierListings();
    await page.addInitScript(() => {
      if (sessionStorage.getItem('e2e-tier-cart-drawer-set')) return;
      sessionStorage.setItem('e2e-tier-cart-drawer-set', '1');
      localStorage.setItem('benched-cart', JSON.stringify([{
        id: 'e2e-bronze-1',
        title: 'E2E Bronze Card 1',
        price: 7,
        quantity: 1,
        sellerId: 'e2e-seller',
        sellerName: 'E2E Seller',
        imageUrls: ['/placeholder.png'],
        category: 'Collector Cards',
        multiCardTier: 'bronze',
        multibuyEnabled: true,
        status: 'available',
      }]));
    });

    await page.goto('/');
    await page.getByRole('button', { name: /Open cart with/ }).click();
    const nudges = page.getByTestId('tier-nudges');
    await expect(nudges).toBeVisible({ timeout: 45_000 });
    await expect(nudges.getByTestId('tier-nudge-link')).toBeVisible();
    await expect(nudges.getByTestId('deal-suggestion-row')).toBeVisible({ timeout: 45_000 });
    await expect(nudges.getByTestId('deal-suggestion-card')).toHaveCount(4);
  });
});
