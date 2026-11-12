import { describe, expect, it } from 'vitest';
import { isValidAbn } from '@/lib/payments/local';
import { formatAbn, normalizeAbn } from '../abn';
import { gstInclusiveBreakdown, roundMoney } from '../gst';
import { listingPauseState, saleTimestampMs, summarizeSales } from '../policy';
import {
  SUPER_SELLER_ABN_GRACE_MS,
  SUPER_SELLER_SALES_AMOUNT_30D_AUD,
  SUPER_SELLER_SALES_COUNT_7D,
} from '../config';

describe('ABN checksum', () => {
  it('accepts known valid ABNs and rejects bad checksums or length', () => {
    expect(isValidAbn('51824753556')).toBe(true);
    expect(normalizeAbn('51 824 753 556')).toBe('51824753556');
    expect(formatAbn('51824753556')).toBe('51 824 753 556');
    expect(isValidAbn('51824753557')).toBe(false);
    expect(isValidAbn('12345678901')).toBe(false);
    expect(normalizeAbn('123')).toBeNull();
    expect(normalizeAbn('')).toBeNull();
    expect(isValidAbn('5182475355')).toBe(false);
  });
});

describe('GST inclusive maths', () => {
  it('splits price/11 so GST and exclusive add back to the inclusive price', () => {
    expect(gstInclusiveBreakdown(110)).toEqual({ incGst: 110, gst: 10, exGst: 100 });
    expect(gstInclusiveBreakdown(11)).toEqual({ incGst: 11, gst: 1, exGst: 10 });
    const ten = gstInclusiveBreakdown(10);
    expect(ten.gst).toBe(0.91);
    expect(ten.exGst).toBe(9.09);
    expect(roundMoney(ten.gst + ten.exGst)).toBe(10);
  });
});

describe('Super Seller thresholds and grace', () => {
  const now = Date.parse('2026-11-13T00:00:00+08:00');

  it('counts completed paid sales in the rolling windows', () => {
    const sales = [
      { amount: 100, atMs: now - 1 * 86400000, status: 'paid' },
      { amount: 100, atMs: now - 2 * 86400000, status: 'completed' },
      { amount: 500, atMs: now - 10 * 86400000, status: 'paid' },
      { amount: 50, atMs: now - 2 * 86400000, status: 'cancelled' },
      { amount: 2000, atMs: now - 40 * 86400000, status: 'paid' },
    ];
    const s = summarizeSales(sales, now);
    expect(s.count7d).toBe(2);
    expect(s.amount30d).toBe(700);
    expect(s.exceedsThreshold).toBe(false);
  });

  it(`exceeds when sales in 7 days are over ${SUPER_SELLER_SALES_COUNT_7D}`, () => {
    const sales = Array.from({ length: 21 }, (_, i) => ({
      amount: 10,
      atMs: now - i * 3600000,
      status: 'paid',
    }));
    expect(summarizeSales(sales, now).exceedsThreshold).toBe(true);
    expect(summarizeSales(sales.slice(1), now).exceedsThreshold).toBe(false);
  });

  it(`exceeds when 30-day sales total is over $${SUPER_SELLER_SALES_AMOUNT_30D_AUD}`, () => {
    const sales = [
      { amount: 1500, atMs: now - 5 * 86400000, status: 'paid' },
      { amount: 500.01, atMs: now - 20 * 86400000, status: 'completed' },
    ];
    expect(summarizeSales(sales, now).exceedsThreshold).toBe(true);
    expect(summarizeSales([{ amount: 2000, atMs: now - 5 * 86400000, status: 'paid' }], now).exceedsThreshold).toBe(false);
  });

  it('does not prompt or pause when an ABN is on file', () => {
    const s = listingPauseState({
      hasValidAbn: true,
      salesExceedThreshold: true,
      abnPromptedAtMs: now - SUPER_SELLER_ABN_GRACE_MS * 2,
      now,
    });
    expect(s).toMatchObject({ shouldPrompt: false, newListingsPaused: false, graceEndsAtMs: null });
  });

  it('prompts without pausing at first crossing, then pauses after the 7-day grace', () => {
    const first = listingPauseState({
      hasValidAbn: false,
      salesExceedThreshold: true,
      abnPromptedAtMs: null,
      now,
    });
    expect(first.shouldPrompt).toBe(true);
    expect(first.newListingsPaused).toBe(false);

    const mid = listingPauseState({
      hasValidAbn: false,
      salesExceedThreshold: true,
      abnPromptedAtMs: now - 3 * 86400000,
      now,
    });
    expect(mid.shouldPrompt).toBe(true);
    expect(mid.newListingsPaused).toBe(false);
    expect(mid.graceDaysLeft).toBe(4);

    const late = listingPauseState({
      hasValidAbn: false,
      salesExceedThreshold: true,
      abnPromptedAtMs: now - SUPER_SELLER_ABN_GRACE_MS,
      now,
    });
    expect(late.newListingsPaused).toBe(true);
    expect(late.graceDaysLeft).toBe(0);
  });

  it('prefers paidAt when reading a sale timestamp', () => {
    expect(saleTimestampMs({ paidAt: 100, collectedAt: 200, updatedAt: 300 })).toBe(100);
    expect(saleTimestampMs({ collectedAt: { seconds: 2 }, updatedAt: 1 })).toBe(2000);
  });
});
