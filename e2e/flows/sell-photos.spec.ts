import path from 'node:path';
import { test, expect } from '@playwright/test';
import { flowsEnabled, signIn, productByTitle } from './helpers';

// Sell form photos: one list of photo objects, so order, pins and uploads stay together.
test.describe('sell form photos', () => {
  test.use({ bypassCSP: true });
  test.skip(!flowsEnabled, 'needs E2E_EMULATORS=true and seeded emulators');

  test('seller pins a photo, makes it the main photo and publishes in that order', async ({ page }) => {
    test.setTimeout(150_000);
    await signIn(page, 'seller@e2e.test', '/sell/create');
    await page.goto('/sell/create');
    await page.getByRole('button', { name: /Basketball Cards/i }).click();

    const input = page.getByTestId('photo-upload-input');
    const photos = page.getByTestId('sell-photo');
    // One photo first, then a title, so adding the second doesn't start AI auto-fill.
    await input.setInputFiles(path.join(process.cwd(), 'public/benched-logo-black.png'));
    await expect(photos).toHaveCount(1, { timeout: 30_000 });
    const title = `E2E Photo Order ${Date.now()}`;
    await page.locator('input[name="title"]').fill(title);
    await input.setInputFiles(path.join(process.cwd(), 'public/wtb-wanted-placeholder.png'));
    await expect(photos).toHaveCount(2, { timeout: 30_000 });

    // Pin photo 2 left of centre with the mouse, then make it the main photo.
    const picker = photos.nth(1).getByTestId('image-focal-picker');
    // locator.click scrolls the picker clear of the sticky header and checks it gets the click.
    const box = (await picker.boundingBox())!;
    // Middle-left: clear of the corner buttons along the top and the 'Make main' button at the bottom.
    await picker.click({ position: { x: box.width * 0.25, y: box.height * 0.5 } });
    await photos.nth(1).getByRole('button', { name: 'Make photo 2 the main photo' }).click();
    await expect(photos.first().getByText('Main')).toBeVisible();

    await page.locator('input[name="price"]').fill('12');
    await page.getByRole('button', { name: /^Publish Listing$/ }).click();
    // Publishing opens the new listing.
    await expect(page).not.toHaveURL(/\/sell\/create/, { timeout: 90_000 });
    await expect.poll(async () => (await productByTitle(title))?.status, { timeout: 30_000 }).toBe('available');

    const doc = await productByTitle(title);
    expect(doc?.imageUrls).toHaveLength(2);
    // The pinned photo moved to the front with its pin; the untouched one has none.
    expect(doc?.imageFocalPoints?.[0]).toEqual(expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) }));
    expect(doc?.imageFocalPoints?.[0].x).toBeLessThan(0.5);
    expect(doc?.imageFocalPoints?.[1] ?? null).toBeNull();
  });
});
