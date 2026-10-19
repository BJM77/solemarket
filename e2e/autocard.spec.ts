import { test, expect } from '@playwright/test';

/**
 * Replaces getUserMedia with a canvas stream: a textured portrait card (63x88) on a
 * plain white background, so the real detector + gate + warp run end to end.
 */
const fakeCamera = (mode: 'card' | 'empty') => `
  (() => {
    const c = document.createElement('canvas'); c.width = 640; c.height = 480;
    const ctx = c.getContext('2d');
    const draw = () => {
      ctx.fillStyle = '#ececec'; ctx.fillRect(0, 0, 640, 480); // off-white: pure #fff reads as clipped glare
      if (${JSON.stringify(mode)} === 'card') {
        const h = 330, w = Math.round(h * 63 / 88), x = (640 - w) / 2, y = 75;
                // Once the front is captured, show a different "back" so the flip check passes.
        const back = !!document.querySelector('[data-testid="autocard-front"]');
        ctx.fillStyle = back ? '#7f1d1d' : '#1e3a8a'; ctx.fillRect(x, y, w, h);
        for (let i = 0; i < 12; i++) {
          ctx.fillStyle = i % 2 ? (back ? '#22c55e' : '#f59e0b') : '#0f172a';
          if (back) ctx.fillRect(x + 10 + i * 15, y + 10, 8, h - 20); else ctx.fillRect(x + 10, y + 10 + i * 25, w - 20, 10);
        }
      }
      requestAnimationFrame(draw);
    };
    draw();
    const stream = c.captureStream(30);
    navigator.mediaDevices.getUserMedia = async () => stream;
  })();
`;

test('AutoCard auto-captures front then back and offers a draft', async ({ page }) => {
  await page.addInitScript(fakeCamera('card'));
  await page.goto('/autocard');
  await expect(page.getByRole('heading', { name: 'AutoCard' })).toBeVisible({ timeout: 15000 });
  await expect(page.getByTestId('autocard-outline')).toBeVisible({ timeout: 15000 });
  await expect(page.getByTestId('autocard-front')).toBeVisible({ timeout: 15000 });
  await expect(page.getByTestId('autocard-back')).toBeVisible({ timeout: 15000 });
  const size = await page.getByTestId('autocard-front').evaluate((img: HTMLImageElement) => [img.naturalWidth, img.naturalHeight]);
  expect(size).toEqual([1260, 1760]);
  await expect(page.getByRole('button', { name: 'Create listing draft' })).toBeVisible();
  await page.getByRole('button', { name: 'Retake back' }).click();
  await expect(page.getByTestId('autocard-guidance').first()).toBeVisible();
});

test('AutoCard shows guidance and manual shutter when no card is present', async ({ page }) => {
  await page.addInitScript(fakeCamera('empty'));
  await page.goto('/autocard');
  await expect(page.getByTestId('autocard-guidance').filter({ hasText: /Place a card|background/i }).first()).toBeVisible({ timeout: 15000 });
  await page.getByRole('button', { name: /Take photo manually/ }).click();
  await expect(page.getByTestId('autocard-front')).toBeVisible();
});
