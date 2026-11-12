import { test, expect, Page } from '@playwright/test';
import { flowsEnabled, signIn, resetGuestListing, ordersFor, productDoc, setSellerPayId, orderPaymentSnapshot, deleteGuestOrders } from './helpers';

// Guests never need an account, even when the seller hasn't set up PayID (cash-only sellers).
const CASH_SELLER = { sellerId: 'e2e-seller-cash', sellerName: 'E2E Cash Seller' };
// Each test uses its own mobile: phones have their own rate limit and open-request cap, and
// orders are found/cleaned up by mobile (guests give a name and mobile, no email).
const PICKUP_MOBILE = '0413 000 001';
const POSTED_MOBILE = '0413 000 002';
const CART_MOBILE = '0413 000 003';

async function fill(scope: ReturnType<Page['getByTestId']>, mobile: string) {
  await scope.locator('#guest-name').fill('Guest Buyer');
  await scope.locator('#guest-mobile').fill(mobile);
}

async function openBuyDialog(page: Page, id: string, title: RegExp) {
  await page.goto(`/product/${id}`);
  await expect(page.getByRole('heading', { name: title }).first()).toBeVisible({ timeout: 45_000 });
  const dialog = page.getByTestId('guest-checkout-dialog').filter({ has: page.locator('#guest-name') });
  await expect(async () => {
    await page.getByRole('button', { name: /buy now/i }).first().click();
    await expect(dialog).toBeVisible({ timeout: 3_000 });
  }).toPass({ timeout: 45_000 });
  // No sign-in wall, whatever the seller's payment set-up.
  await expect(dialog.getByText(/sign in to continue/i)).toHaveCount(0);
  return dialog;
}

test.describe('guest requests to a seller without PayID', () => {
  test.use({ bypassCSP: true });
  test.describe.configure({ mode: 'serial' });
  test.skip(!flowsEnabled, 'needs E2E_EMULATORS=true and seeded emulators');
  // Every CI guest shares one IP, which has a 3-open-requests cap: don't leave requests open.
  test.afterEach(async () => {
    for (const m of [PICKUP_MOBILE, POSTED_MOBILE, CART_MOBILE]) await deleteGuestOrders(m);
  });

  test('pickup request becomes cash on pickup; seller accepts; guest sees cash instructions', async ({ page, browser }) => {
    test.setTimeout(180_000);
    await setSellerPayId('e2e-seller-cash', null);
    await resetGuestListing(PICKUP_MOBILE, 'e2e-guest-cash-1', { ...CASH_SELLER, title: 'E2E Cash Seller Card', price: 18 });
    const dialog = await openBuyDialog(page, 'e2e-guest-cash-1', /E2E Cash Seller Card/i);
    await fill(dialog, PICKUP_MOBILE);
    await dialog.getByTestId('guest-send-request').click();
    await expect(page).toHaveURL(/\/order\/[A-Za-z0-9_-]{40,}/, { timeout: 45_000 });
    await expect(page.getByTestId('request-pending')).toBeVisible();

    const [order] = await ordersFor(PICKUP_MOBILE);
    expect(order).toMatchObject({ status: 'requested', isGuest: true, paymentMethod: 'cash', shippingMethod: 'pickup', sellerId: 'e2e-seller-cash' });

    const ctx = await browser.newContext({ bypassCSP: true });
    const seller = await ctx.newPage();
    await signIn(seller, 'cashseller@e2e.test');
    await seller.goto('/seller/dashboard');
    const card = seller.getByTestId(`seller-order-${order.id}`).first();
    await expect(card).toBeVisible({ timeout: 60_000 });
    await card.getByTestId('seller-request-accept').click();
    await expect.poll(async () => ((await productDoc('e2e-guest-cash-1')).checkoutHolds || []).length, { timeout: 30_000 }).toBe(1);
    await ctx.close();

    await page.reload();
    await expect(page.getByTestId('pay-cash')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('pay-payid')).toHaveCount(0);
  });

  test('posted request goes through; the seller adds a PayID and it is copied on accept', async ({ page, browser }) => {
    test.setTimeout(180_000);
    await setSellerPayId('e2e-seller-cash', null);
    await resetGuestListing(POSTED_MOBILE, 'e2e-guest-cash-2', { ...CASH_SELLER, title: 'E2E Posted Cash Seller Card', price: 22 });
    const dialog = await openBuyDialog(page, 'e2e-guest-cash-2', /E2E Posted Cash Seller Card/i);
    await fill(dialog, POSTED_MOBILE);
    await dialog.getByRole('button', { name: /post it to me/i }).click();
    await dialog.getByPlaceholder('Street address').fill('1 Test Street');
    await dialog.getByPlaceholder(/suburb|city/i).first().fill('Perth');
    await dialog.getByPlaceholder(/postcode/i).first().fill('6000');
    await dialog.getByTestId('guest-send-request').click();
    await expect(page).toHaveURL(/\/order\/[A-Za-z0-9_-]{40,}/, { timeout: 45_000 });

    const [order] = await ordersFor(POSTED_MOBILE);
    expect(order).toMatchObject({ status: 'requested', paymentMethod: 'payid', shippingMethod: 'shipping' });
    expect(await orderPaymentSnapshot(order.id)).toBeUndefined();

    // Seller sets up PayID, then accepts: the PayID is copied onto the order for the guest.
    await setSellerPayId('e2e-seller-cash', '0411111111');
    const ctx = await browser.newContext({ bypassCSP: true });
    const seller = await ctx.newPage();
    await signIn(seller, 'cashseller@e2e.test');
    await seller.goto('/seller/dashboard');
    const card = seller.getByTestId(`seller-order-${order.id}`).first();
    await expect(card).toBeVisible({ timeout: 60_000 });
    await card.getByTestId('seller-request-accept').click();
    await expect.poll(async () => (await orderPaymentSnapshot(order.id))?.payId, { timeout: 30_000 }).toBe('0411111111');
    await ctx.close();
    await setSellerPayId('e2e-seller-cash', null);

    await page.reload();
    await expect(page.getByTestId('pay-payid')).toHaveText('0411111111', { timeout: 30_000 });
  });

  test('signed-out cart checkout sends a request without an account', async ({ page }) => {
    test.setTimeout(120_000);
    await setSellerPayId('e2e-seller-cash', null);
    await resetGuestListing(CART_MOBILE, 'e2e-guest-cash-3', { ...CASH_SELLER, title: 'E2E Cart Cash Card', price: 9 });
    await page.addInitScript(() => {
      if (sessionStorage.getItem('e2e-cart-set')) return;
      sessionStorage.setItem('e2e-cart-set', '1');
      localStorage.setItem('benched-cart', JSON.stringify([{
        id: 'e2e-guest-cash-3', title: 'E2E Cart Cash Card', price: 9, quantity: 1, sellerId: 'e2e-seller-cash', sellerName: 'E2E Cash Seller',
        imageUrls: ['/placeholder.png'], category: 'Collector Cards', status: 'available',
      }]));
      localStorage.setItem('benched-shipping-method', 'pickup');
    });
    await page.goto('/checkout');
    await expect(page).toHaveURL(/\/checkout/);
    const contact = page.getByTestId('guest-checkout-contact');
    await expect(contact).toBeVisible({ timeout: 45_000 });
    await contact.locator('#guestName').fill('Guest Buyer');
    await expect(contact.locator('#guestEmail')).toHaveCount(0);
    await contact.locator('#guestMobile').fill(CART_MOBILE);
    await expect(page.getByTestId('guest-payment-note')).toBeVisible();
    await page.getByTestId('checkout-submit').click();
    await expect(page).toHaveURL(/\/order\/[A-Za-z0-9_-]{40,}/, { timeout: 45_000 });
    const [order] = await ordersFor(CART_MOBILE);
    expect(order).toMatchObject({ status: 'requested', isGuest: true, paymentMethod: 'cash' });
  });
});
