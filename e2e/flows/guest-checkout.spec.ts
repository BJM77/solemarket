import { test, expect, Page } from '@playwright/test';
import { flowsEnabled, signIn, resetGuestListing, productDoc, ordersFor, deleteGuestOrders } from './helpers';

// Guests give only a name and an Australian mobile. Each test uses its own mobile: phones have
// their own rate limit and open-request cap, and orders are found/cleaned up by mobile.
const MOBILE = '0412 345 678';
const OFFER_MOBILE = '0412 345 679';

async function fillGuestDetails(dialog: ReturnType<Page['getByTestId']>, mobile: string) {
  await dialog.locator('#guest-name').fill('Guest Buyer');
  await expect(dialog.locator('#guest-email')).toHaveCount(0);
  await dialog.locator('#guest-mobile').fill(mobile);
  // Honeypot stays empty for a person; no email code.
  await expect(dialog.locator('#guest-website')).toHaveValue('');
}

async function sellerPage(browser: any) {
  const ctx = await browser.newContext({ bypassCSP: true });
  const seller = await ctx.newPage();
  await signIn(seller, 'seller@e2e.test');
  await seller.goto('/seller/dashboard');
  return { ctx, seller };
}

// Signed-out buyer sends a request; the seller approves it; then the PayID is shown.
test.describe('guest requests (no account), seller approval', () => {
  test.use({ bypassCSP: true });
  test.skip(!flowsEnabled, 'needs E2E_EMULATORS=true and seeded emulators');
  // Every CI guest shares one IP, which has a 3-open-requests cap: don't leave requests open.
  // Only this test's own orders: tests in this file run in parallel.
  let mine: string | null = null;
  test.afterEach(async () => {
    if (mine) await deleteGuestOrders(mine);
    mine = null;
  });

  test('guest requests to buy, seller accepts, guest sees PayID, seller marks paid', async ({ page, browser }) => {
    test.setTimeout(180_000);
    mine = MOBILE;
    await resetGuestListing(MOBILE);
    await page.goto('/product/e2e-guest-1');
    await expect(page.getByRole('heading', { name: /E2E Guest Checkout Card/i }).first()).toBeVisible({ timeout: 45_000 });

    const dialog = page.getByTestId('guest-checkout-dialog').filter({ has: page.locator('#guest-name') });
    // Auth state may still be resolving on first paint; retry until the guest dialog opens.
    await expect(async () => {
      await page.getByRole('button', { name: /buy now/i }).first().click();
      await expect(dialog).toBeVisible({ timeout: 3_000 });
    }).toPass({ timeout: 45_000 });
    await fillGuestDetails(dialog, MOBILE);
    await dialog.getByTestId('guest-send-request').click();

    await expect(page).toHaveURL(/\/order\/[A-Za-z0-9_-]{40,}/, { timeout: 45_000 });
    await expect(page.getByTestId('guest-order-page')).toBeVisible();
    await expect(page.getByTestId('guest-order-status')).toContainText(/waiting for the seller/i);
    await expect(page.getByTestId('request-pending')).toBeVisible();
    // Not accepted yet: no PayID, no countdown.
    await expect(page.getByTestId('pay-payid')).toHaveCount(0);
    await expect(page.getByTestId('hold-countdown')).toHaveCount(0);
    await expect(page.getByTestId('guest-save-link')).toContainText(/bookmark/i);
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('benched:guest-orders') || '[]'));
    expect(saved).toHaveLength(1);
    expect(page.url()).toContain(saved[0].token);

    // A request is not a hold: the listing is untouched and still buyable by others.
    const listed = await productDoc('e2e-guest-1');
    expect(listed.status).toBe('available');
    expect(listed.checkoutHolds || []).toHaveLength(0);
    const [order] = await ordersFor(MOBILE);
    expect(order).toMatchObject({ status: 'requested', stockMode: 'request', requestType: 'buy', isGuest: true, buyerPhone: '+61412345678', buyerName: 'Guest Buyer' });
    expect(order.buyerEmail ?? null).toBeNull();

    const other = await browser.newContext({ bypassCSP: true });
    const otherPage = await other.newPage();
    await otherPage.goto('/product/e2e-guest-1');
    await expect(otherPage.getByTestId('listing-request-count')).toContainText(/1 request/i, { timeout: 45_000 });
    await expect(otherPage.getByTestId('listing-on-hold')).toHaveCount(0);
    await expect(otherPage.getByTestId('listing-reserved')).toHaveCount(0);
    await other.close();

    // Seller sees the request with the guest's contact details and accepts it.
    const { ctx: sellerCtx, seller } = await sellerPage(browser);
    const card = seller.getByTestId(`seller-order-${order.id}`).first();
    await expect(card).toBeVisible({ timeout: 60_000 });
    // Name and mobile only, with tap-to-call and tap-to-text.
    await expect(card.getByTestId('guest-buyer-contact')).toContainText('0412 345 678');
    await expect(card.getByTestId('buyer-call')).toHaveAttribute('href', 'tel:+61412345678');
    await expect(card.getByTestId('buyer-sms')).toHaveAttribute('href', 'sms:+61412345678');
    await expect(card.getByText(/email buyer/i)).toHaveCount(0);
    await card.getByTestId('seller-request-accept').click();
    await expect.poll(async () => ((await productDoc('e2e-guest-1')).checkoutHolds || []).length, { timeout: 30_000 }).toBe(1);
    const reserved = await productDoc('e2e-guest-1');
    expect(reserved.checkoutHolds[0]).toMatchObject({ orderId: order.id, reserved: true });
    expect(reserved.status).toBe('available');

    // The guest now sees the PayID and the reference.
    await page.reload();
    await expect(page.getByTestId('pay-payid')).toHaveText('0400000000', { timeout: 30_000 });
    await expect(page.getByTestId('copy-all-payid-btn')).toBeVisible();
    await expect(page.getByTestId('request-accepted')).toBeVisible();

    // Seller marks it paid: sold.
    await expect(card.getByTestId('seller-mark-paid')).toBeVisible({ timeout: 30_000 });
    await card.getByTestId('seller-mark-paid').click();
    await expect.poll(async () => (await productDoc('e2e-guest-1')).status, { timeout: 30_000 }).toBe('sold');
    await sellerCtx.close();

    await page.reload();
    await expect(page.getByTestId('guest-order-status')).toContainText(/paid/i, { timeout: 30_000 });
  });

  test('guest offers, seller counters, guest accepts the counter, seller relists', async ({ page, browser }) => {
    test.setTimeout(180_000);
    mine = OFFER_MOBILE;
    await resetGuestListing(OFFER_MOBILE, 'e2e-guest-2', { title: 'E2E Offer Card', price: 40, isNegotiable: true });
    await page.goto('/product/e2e-guest-2');
    await expect(page.getByRole('heading', { name: /E2E Offer Card/i }).first()).toBeVisible({ timeout: 45_000 });

    const dialog = page.getByTestId('guest-checkout-dialog').filter({ has: page.locator('#guest-offer') });
    await expect(async () => {
      await page.getByRole('button', { name: /make an offer/i }).first().click();
      await expect(dialog).toBeVisible({ timeout: 3_000 });
    }).toPass({ timeout: 45_000 });
    await dialog.locator('#guest-offer').fill('25');
    await fillGuestDetails(dialog, OFFER_MOBILE);
    await dialog.getByTestId('guest-send-request').click();
    await expect(page).toHaveURL(/\/order\/[A-Za-z0-9_-]{40,}/, { timeout: 45_000 });
    await expect(page.getByTestId('request-pending')).toContainText('$25.00');

    const [order] = await ordersFor(OFFER_MOBILE);
    expect(order).toMatchObject({ status: 'requested', requestType: 'offer', offerAmount: 25 });

    // Seller declines with a counter of $32.
    const { ctx: sellerCtx, seller } = await sellerPage(browser);
    const card = seller.getByTestId(`seller-order-${order.id}`).first();
    await expect(card).toBeVisible({ timeout: 60_000 });
    await card.getByTestId('seller-request-counter').click();
    await card.getByTestId('seller-counter-amount').fill('32');
    await card.getByTestId('seller-counter-send').click();
    await expect(card.getByTestId('seller-request-countered')).toBeVisible({ timeout: 30_000 });

    // Guest accepts the counter: reserved at $32 and the PayID is shown.
    await page.reload();
    await expect(page.getByTestId('counter-amount')).toHaveText('$32.00', { timeout: 30_000 });
    await page.getByTestId('counter-accept').click();
    await expect(page.getByTestId('pay-payid')).toHaveText('0400000000', { timeout: 30_000 });
    await expect(page.getByTestId('pay-amount')).toHaveText('$32.00');
    const reserved = await productDoc('e2e-guest-2');
    expect(reserved.checkoutHolds).toHaveLength(1);
    expect(reserved.checkoutHolds[0]).toMatchObject({ orderId: order.id, reserved: true });

    // The buyer is slow: the seller relists it and it's back on sale.
    seller.on('dialog', (d) => d.accept());
    await seller.reload();
    const card2 = seller.getByTestId(`seller-order-${order.id}`).first();
    await expect(card2.getByTestId('seller-request-waiting')).toBeVisible({ timeout: 60_000 });
    await card2.getByTestId('seller-relist').click();
    await expect.poll(async () => ((await productDoc('e2e-guest-2')).checkoutHolds || []).length, { timeout: 30_000 }).toBe(0);
    await sellerCtx.close();
    expect((await productDoc('e2e-guest-2')).status).toBe('available');

    await page.reload();
    await expect(page.getByTestId('guest-order-status')).toContainText(/relisted/i, { timeout: 30_000 });
    await expect(page.getByTestId('pay-payid')).toHaveCount(0);
  });
});
