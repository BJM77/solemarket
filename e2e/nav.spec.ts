import { test, expect } from '@playwright/test';

test.describe('desktop nav dropdowns', () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) < 1024, 'desktop only');

  test('hover opens, moving into the panel keeps it open, leaving closes', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const trigger = page.locator('[data-hover-menu] > button').first();
    await expect(trigger).toBeVisible();
    await trigger.hover();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    const menu = page.getByRole('menu').first();
    const tb = (await trigger.boundingBox())!;
    // walk straight down through the bridge into the first item
    await page.mouse.move(tb.x + 10, tb.y + tb.height + 4, { steps: 3 });
    await page.getByRole('menuitem').first().hover();
    await expect(menu).toBeVisible();
    await page.mouse.move(5, 600);
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  test('panel stacks above header and ticker', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.locator('[data-hover-menu] > button').first().click();
    const item = page.getByRole('menuitem').last();
    const b = (await item.boundingBox())!;
    const topIsItem = await page.evaluate(([x, y]) => !!document.elementFromPoint(x, y)?.closest('[role="menuitem"]'), [b.x + b.width / 2, b.y + b.height / 2]);
    expect(topIsItem).toBe(true);
  });

  test('keyboard: Enter opens and focuses first item, Escape returns focus', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const trigger = page.locator('[data-hover-menu] > button').first();
    await trigger.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('menuitem').first()).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('menuitem').nth(1)).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(trigger).toBeFocused();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });
});

test.describe('mobile nav', () => {
  test.skip(({ viewport }) => (viewport?.width ?? 9999) >= 1024, 'mobile only');

  test('menu opens, close button is a 44px target', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: /menu|navigation/i }).first().click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    const close = dialog.getByRole('button', { name: 'Close' });
    const b = (await close.boundingBox())!;
    expect(b.height).toBeGreaterThanOrEqual(44);
    await close.click();
    await expect(dialog).toBeHidden();
  });
});
