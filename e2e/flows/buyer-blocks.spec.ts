import { test, expect, Page } from '@playwright/test';
import {
  flowsEnabled, signIn, resetGuestListing, ordersFor, deleteGuestOrders, deleteBlocksFor, sellerBlocksFor,
  blockSitewide, clearRateLimits,
} from './helpers';

// Buyers give a name and mobile; sellers can block a mobile, and admins can block one sitewide.
const MOBILE = '0414 000 001';
const SITE_MOBILE = '0414 000 002';

async function openBuyDialog(page: Page, id: string, title: RegExp) {
  await page.goto(`/product/${id}`);
  await expect(page.getByRole('heading', { name: title }).first()).toBeVisible({ timeout: 45_000 });
  const dialog = page.getByTestId('guest-checkout-dialog').filter({ has: page.locator('#guest-name') });
  await expect(async () => {
    await page.getByRole('button', { name: /buy now/i }).first().click();
    await expect(dialog).toBeVisible({ timeout: 3_000 });
  }).toPass({ timeout: 45_000 });
  return dialog;
}

async function fill(dialog: ReturnType<Page['getByTestId']>, mobile: string) {
  await dialog.locator('#guest-name').fill('Blocked Buyer');
  await dialog.locator('#guest-mobile').fill(mobile);
}

test.describe('blocking buyer mobiles', () => {
  test.use({ bypassCSP: true });
  test.describe.configure({ mode: 'serial' });
  test.skip(!flowsEnabled, 'needs E2E_EMULATORS=true and seeded emulators');

  // Every CI guest shares one IP (rate limits + 3-open-requests cap): start clean, leave clean.
  test.beforeAll(async () => { await clearRateLimits(); });
  test.afterEach(async () => {
    for (const m of [MOBILE, SITE_MOBILE]) {
      await deleteGuestOrders(m);
      await deleteBlocksFor(m);
    }
  });

  test('seller blocks a buyer: open request declined, new ones refused, then unblocked', async ({ page, browser }) => {
    test.setTimeout(240_000);
    await resetGuestListing(MOBILE, 'e2e-block-1', { title: 'E2E Block Card', price: 11 });
    await resetGuestListing(MOBILE, 'e2e-block-2', { title: 'E2E Block Card Two', price: 13 });

    const dialog = await openBuyDialog(page, 'e2e-block-1', /E2E Block Card/i);
    await fill(dialog, MOBILE);
    await dialog.getByTestId('guest-send-request').click();
    await expect(page).toHaveURL(/\/order\/[A-Za-z0-9_-]{40,}/, { timeout: 45_000 });
    const [order] = await ordersFor(MOBILE);
    expect(order).toMatchObject({ status: 'requested', buyerPhone: '+61414000001' });

    // Seller blocks the buyer from the request card.
    const ctx = await browser.newContext({ bypassCSP: true });
    const seller = await ctx.newPage();
    await signIn(seller, 'seller@e2e.test');
    await seller.goto('/seller/dashboard?tab=orders');
    const card = seller.getByTestId(`seller-order-${order.id}`).first();
    await expect(card).toBeVisible({ timeout: 60_000 });
    await expect(card.getByTestId('buyer-history')).toContainText(/new buyer/i, { timeout: 30_000 });
    await card.getByTestId('seller-block-buyer').click();
    const blockDialog = seller.getByTestId('block-buyer-dialog');
    await blockDialog.locator('input').fill('No-show for pickup');
    await blockDialog.getByTestId('block-buyer-confirm').click();
    await expect.poll(async () => (await ordersFor(MOBILE))[0]?.status, { timeout: 30_000 }).toBe('declined');
    expect((await ordersFor(MOBILE))[0].declineReason).toBe('seller_blocked');
    const blocks = await sellerBlocksFor(MOBILE);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatchObject({ sellerId: 'e2e-seller', mobile: '+61414000001', reason: 'No-show for pickup' });

    // The buyer can't send this seller a new request (neutral wording).
    const again = await openBuyDialog(page, 'e2e-block-2', /E2E Block Card Two/i);
    await fill(again, MOBILE);
    await again.getByTestId('guest-send-request').click();
    await expect(again.getByRole('alert')).toHaveText("This seller isn't accepting requests from you.", { timeout: 30_000 });
    expect((await ordersFor(MOBILE)).filter((o) => o.status === 'requested')).toHaveLength(0);

    // Seller unblocks from "Blocked buyers"; the buyer can send a request again.
    const list = seller.getByTestId('blocked-buyers');
    await list.locator('summary').click();
    const row = list.getByTestId('blocked-buyer-row').filter({ hasText: '0414 000 001' });
    await expect(row).toBeVisible({ timeout: 30_000 });
    await row.getByTestId('unblock-buyer').click();
    await expect.poll(async () => (await sellerBlocksFor(MOBILE)).length, { timeout: 30_000 }).toBe(0);
    await ctx.close();

    await again.getByTestId('guest-send-request').click();
    await expect(page).toHaveURL(/\/order\/[A-Za-z0-9_-]{40,}/, { timeout: 45_000 });
  });

  test('a sitewide block refuses requests with the support message', async ({ page }) => {
    test.setTimeout(120_000);
    await blockSitewide(SITE_MOBILE);
    await resetGuestListing(SITE_MOBILE, 'e2e-block-3', { title: 'E2E Sitewide Block Card', price: 14 });
    const dialog = await openBuyDialog(page, 'e2e-block-3', /E2E Sitewide Block Card/i);
    await fill(dialog, SITE_MOBILE);
    await dialog.getByTestId('guest-send-request').click();
    await expect(dialog.getByRole('alert')).toHaveText("We can't accept requests from this number. Contact support.", { timeout: 30_000 });
    expect(await ordersFor(SITE_MOBILE)).toHaveLength(0);
  });
});
