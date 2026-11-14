import { test, expect } from '@playwright/test';
import { flowsEnabled } from './helpers';

// Runs against the Firebase emulators seeded by e2e/flows/seed.mjs (CI job e2e-flows).
test.describe('mobile listing photo gallery', () => {
  test.use({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    bypassCSP: true,
  });
  test.skip(!flowsEnabled, 'needs E2E_EMULATORS=true and seeded emulators');

  test('tapping the photo opens the gallery and the close button dismisses it', async ({ page }) => {
    await page.goto('/product/e2e-live-1');
    const photo = page.getByTestId('listing-main-photo');
    await expect(photo).toBeVisible({ timeout: 45_000 });
    await expect(page.getByText('Hold to zoom')).toHaveCount(0);

    await photo.click();

    const gallery = page.getByTestId('listing-mobile-gallery');
    await expect(gallery).toBeVisible();
    await expect(page.getByTestId('listing-mobile-gallery-counter')).toHaveText('1 / 1');
    await expect(page.getByTestId('listing-zoom-overlay')).toHaveCount(0);

    await page.getByTestId('listing-mobile-gallery-close').click();
    await expect(gallery).toHaveCount(0);
  });

  test('the browser back button closes the gallery without leaving the listing', async ({ page }) => {
    await page.goto('/product/e2e-live-1');
    await expect(page.getByTestId('listing-main-photo')).toBeVisible({ timeout: 45_000 });
    await page.getByTestId('listing-main-photo').click();
    await expect(page.getByTestId('listing-mobile-gallery')).toBeVisible();

    await page.goBack();

    await expect(page.getByTestId('listing-mobile-gallery')).toHaveCount(0);
    await expect(page).toHaveURL(/\/product\//);
  });
});
