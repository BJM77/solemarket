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
