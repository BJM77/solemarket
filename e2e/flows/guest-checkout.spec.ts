import { test, expect } from '@playwright/test';
import { flowsEnabled, signIn, resetGuestListing, latestGuestCode, productDoc } from './helpers';

const EMAIL = 'guest.buyer@e2e.test';

// Signed-out buyer: details -> emailed 6-digit code -> 30-minute PayID hold -> seller marks paid.
test.describe('guest checkout (no account)', () => {
  test.use({ bypassCSP: true });
  test.skip(!flowsEnabled, 'needs E2E_EMULATORS=true and seeded emulators');
  test.beforeEach(async () => { await resetGuestListing(EMAIL); });

  test('guest holds an item for 30 minutes, sees the PayID, seller marks it paid', async ({ page, browser }) => {
    test.setTimeout(180_000);
    await page.goto('/product/e2e-guest-1');
    await expect(page.getByRole('heading', { name: /E2E Guest Checkout Card/i }).first()).toBeVisible({ timeout: 45_000 });

    const dialog = page.getByTestId('guest-checkout-dialog');
    // Auth state may still be resolving on first paint; retry until the guest dialog opens.
    await expect(async () => {
      await page.getByRole('button', { name: /buy now/i }).first().click();
      await expect(dialog).toBeVisible({ timeout: 3_000 });
    }).toPass({ timeout: 45_000 });
    await dialog.locator('#guest-name').fill('Guest Buyer');
    await dialog.locator('#guest-email').fill(EMAIL);
    await dialog.locator('#guest-mobile').fill('0412 345 678');
    await dialog.getByTestId('guest-send-code').click();
    await expect(dialog.locator('#guest-code')).toBeVisible({ timeout: 30_000 });

    let code: string | undefined;
    await expect.poll(async () => (code = await latestGuestCode(EMAIL)), { timeout: 15_000 }).toMatch(/^\d{6}$/);

    // A wrong code is rejected without holding anything.
    await dialog.locator('#guest-code').fill(code === '000000' ? '111111' : '000000');
    await dialog.getByTestId('guest-confirm-code').click();
    await expect(dialog.getByRole('alert')).toContainText(/isn't right/i, { timeout: 15_000 });
    expect((await productDoc('e2e-guest-1')).checkoutHolds || []).toHaveLength(0);

    await dialog.locator('#guest-code').fill(code!);
    await dialog.getByTestId('guest-confirm-code').click();

    await expect(page).toHaveURL(/\/order\/[A-Za-z0-9_-]{40,}/, { timeout: 45_000 });
    await expect(page.getByTestId('guest-order-page')).toBeVisible();
    await expect(page.getByTestId('pay-payid')).toHaveText('0400000000');
    await expect(page.getByTestId('hold-countdown')).toHaveText(/^(30:00|29:\d\d)$/);
    await expect(page.getByTestId('copy-all-payid-btn')).toBeVisible();

    // The listing is held: stock untouched, one 30-minute hold.
    const held = await productDoc('e2e-guest-1');
    expect(held.status).toBe('available');
    expect(held.quantity).toBe(1);
    expect(held.checkoutHolds).toHaveLength(1);
    const orderId = held.checkoutHolds[0].orderId;
    expect(held.checkoutHolds[0].expiresAtMs - Date.now()).toBeGreaterThan(28 * 60_000);

    // Another visitor sees it on hold and can't buy it.
    const other = await browser.newContext({ bypassCSP: true });
    const otherPage = await other.newPage();
    await otherPage.goto('/product/e2e-guest-1');
    await expect(otherPage.getByTestId('listing-on-hold')).toBeVisible({ timeout: 45_000 });
    await other.close();

    // Seller sees the guest's contact details and marks the order paid.
    const sellerCtx = await browser.newContext({ bypassCSP: true });
    const seller = await sellerCtx.newPage();
    await signIn(seller, 'seller@e2e.test');
    await seller.goto('/seller/dashboard');
    const card = seller.getByTestId(`seller-order-${orderId}`).first();
    await expect(card).toBeVisible({ timeout: 60_000 });
    await expect(card.getByTestId('guest-buyer-contact')).toContainText(EMAIL);
    await expect(card.getByTestId('guest-buyer-contact')).toContainText('+61412345678');
    await card.getByTestId('seller-mark-paid').click();
    await expect.poll(async () => (await productDoc('e2e-guest-1')).status, { timeout: 30_000 }).toBe('sold');
    await sellerCtx.close();

    // The guest's order page now shows it paid.
    await page.reload();
    await expect(page.getByTestId('guest-order-status')).toContainText(/paid/i, { timeout: 30_000 });
  });
});
