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

    // Open photo 2 in the editor, put its pin near the top-left, make it the main photo.
    await photos.nth(1).getByTestId('sell-photo-edit').click();
    const editor = page.getByTestId('photo-editor');
    await expect(editor).toBeVisible();
    const pinArea = editor.getByTestId('focal-pin-editor');
    const box = (await pinArea.boundingBox())!;
    await pinArea.click({ position: { x: box.width * 0.2, y: box.height * 0.2 } });
    // Keyboard works too: one step right.
    await editor.getByRole('slider', { name: 'Centre of photo 2' }).press('ArrowRight');
    await editor.getByRole('button', { name: /Make main photo/ }).click();
    await expect(editor.getByRole('heading', { name: /main photo/ })).toBeVisible();
    await editor.getByTestId('photo-editor-done').click();
    await expect(editor).toHaveCount(0);
    await expect(photos.first().getByText('Main')).toBeVisible();
    await expect(photos.first().getByText('Centre set')).toBeAttached();

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
