import {
  SUPER_SELLER_ABN_GRACE_MS,
  SUPER_SELLER_SALES_AMOUNT_30D_AUD,
  SUPER_SELLER_SALES_COUNT_7D,
} from './config';
import { roundMoney } from './gst';

const DAY_MS = 24 * 60 * 60 * 1000;

export function isCompletedSaleStatus(status: unknown): boolean {
  const s = String(status ?? '').toLowerCase();
  return s === 'paid' || s === 'completed';
}

function toMs(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const t = Date.parse(v);
    return Number.isFinite(t) ? t : null;
  }
  if (typeof v === 'object') {
    const o = v as { toMillis?: () => number; toDate?: () => Date; seconds?: number };
    if (typeof o.toMillis === 'function') return o.toMillis();
    if (typeof o.toDate === 'function') return o.toDate().getTime();
    if (typeof o.seconds === 'number') return o.seconds * 1000;
  }
  return null;
}

/** Prefer paidAt, then collectedAt, then updatedAt. */
export function saleTimestampMs(o: { paidAt?: unknown; collectedAt?: unknown; updatedAt?: unknown }): number | null {
  return toMs(o.paidAt) ?? toMs(o.collectedAt) ?? toMs(o.updatedAt);
}

export interface SaleRecord {
  amount: number;
  atMs: number;
  status?: string;
}

export interface SalesSummary {
  count7d: number;
  amount30d: number;
  exceedsThreshold: boolean;
}

export function summarizeSales(sales: SaleRecord[], now = Date.now()): SalesSummary {
  const weekStart = now - 7 * DAY_MS;
  const monthStart = now - 30 * DAY_MS;
  const completed = sales.filter((s) => isCompletedSaleStatus(s.status) && Number.isFinite(s.atMs) && s.atMs > 0);
  const last7 = completed.filter((s) => s.atMs >= weekStart);
  const last30 = completed.filter((s) => s.atMs >= monthStart);
  const amount30d = roundMoney(last30.reduce((sum, s) => sum + (Number(s.amount) || 0), 0));
  return {
    count7d: last7.length,
    amount30d,
    exceedsThreshold: last7.length > SUPER_SELLER_SALES_COUNT_7D || amount30d > SUPER_SELLER_SALES_AMOUNT_30D_AUD,
  };
}

export interface ListingPauseState {
  shouldPrompt: boolean;
  newListingsPaused: boolean;
  graceEndsAtMs: number | null;
  graceDaysLeft: number | null;
}

/**
 * Once a seller crosses a volume threshold they are prompted for an ABN.
 * After the grace period, new listings are paused until a valid ABN is on file.
 * Existing live listings are never taken down by this rule.
 */
export function listingPauseState(opts: {
  hasValidAbn: boolean;
  salesExceedThreshold: boolean;
  abnPromptedAtMs: number | null;
  now?: number;
}): ListingPauseState {
  const now = opts.now ?? Date.now();
  if (opts.hasValidAbn) {
    return { shouldPrompt: false, newListingsPaused: false, graceEndsAtMs: null, graceDaysLeft: null };
  }
  const promptedAt = opts.abnPromptedAtMs && opts.abnPromptedAtMs > 0 ? opts.abnPromptedAtMs : null;
  if (!opts.salesExceedThreshold && !promptedAt) {
    return { shouldPrompt: false, newListingsPaused: false, graceEndsAtMs: null, graceDaysLeft: null };
  }
  const startedAt = promptedAt ?? now;
  const graceEndsAtMs = startedAt + SUPER_SELLER_ABN_GRACE_MS;
  const remaining = graceEndsAtMs - now;
  const newListingsPaused = !!promptedAt && remaining <= 0;
  const graceDaysLeft = promptedAt && remaining > 0
    ? Math.ceil(remaining / DAY_MS)
    : promptedAt
      ? 0
      : SUPER_SELLER_ABN_GRACE_MS / DAY_MS;
  return {
    shouldPrompt: true,
    newListingsPaused,
    graceEndsAtMs,
    graceDaysLeft,
  };
}
