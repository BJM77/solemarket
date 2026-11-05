import { expect, Page } from '@playwright/test';

export const PASSWORD = 'e2e-Password-123';
export const flowsEnabled = process.env.E2E_EMULATORS === 'true';

export async function signIn(page: Page, email: string, redirect = '/') {
  await page.goto(`/sign-in?redirect=${encodeURIComponent(redirect)}`);
  const form = page.locator('form').filter({ has: page.locator('input[type="password"]') }).first();
  await form.locator('input[type="email"]').fill(email);
  await form.locator('input[type="password"]').fill(PASSWORD);
  await form.locator('button[type="submit"]').click();
  await expect(page).not.toHaveURL(/\/sign-in/, { timeout: 30_000 });
  // Protected routes need the server session cookie, which is set just after client sign-in.
  await expect.poll(async () => (await page.context().cookies()).some((c) => c.name === 'session' || c.name === '__session'), { timeout: 30_000 }).toBe(true);
}

/** Restore the seeded bulk drafts (emulator only) so the publish flow is repeatable. */
export async function resetDrafts() {
  const { default: admin } = await import('firebase-admin');
  const projectId = process.env.GCLOUD_PROJECT || 'demo-benched';
  if (!projectId.startsWith('demo-')) throw new Error('Refusing to reset a non-demo project');
  process.env.FIRESTORE_EMULATOR_HOST ||= '127.0.0.1:8080';
  const app = admin.apps.find((a) => a?.name === 'e2e-reset') || admin.initializeApp({ projectId }, 'e2e-reset');
  const db = app.firestore();
  const now = admin.firestore.FieldValue.serverTimestamp();
  for (let i = 1; i <= 3; i++) {
    await db.doc(`products/e2e-draft-${i}`).set({
      sellerId: 'e2e-seller', sellerName: 'E2E Seller', category: 'Collector Cards', subCategory: 'Pokemon',
      condition: 'Near Mint', quantity: 1, imageUrls: ['/placeholder.png'], description: 'Seeded for e2e.',
      acceptsPayId: true, acceptsCash: true, createdAt: now, updatedAt: now,
      title: `E2E Draft Card ${i}`, price: 5 + i, status: 'draft', isDraft: true,
    });
  }
}
