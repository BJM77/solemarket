/**
 * Blocked buyers (pure helpers, unit tested; safe on the client and the server).
 *
 * Two levels, both keyed on the buyer's Australian mobile (E.164) plus any account uids seen
 * with it:
 *  - seller level: a seller blocks a buyer from their own listings (seller_blocks/{sellerId}_{key})
 *  - sitewide:     an admin blocks a number on every listing (blocked_mobiles/{key})
 * Both collections are written and read only by server actions (Admin SDK); rules deny clients.
 */
import { normalizeAuMobile } from './guest-validation';

export const SELLER_BLOCKED_MESSAGE = "This seller isn't accepting requests from you.";
export const SITEWIDE_BLOCKED_MESSAGE = "We can't accept requests from this number. Contact support.";
export const MOBILE_REQUIRED_MESSAGE = 'Add your Australian mobile (e.g. 0412 345 678) so the seller can contact you about this request.';
/** Admins see numbers blocked by at least this many sellers, to promote them to sitewide. */
export const MULTI_SELLER_BLOCK_THRESHOLD = 2;
export const MAX_BLOCK_REASON = 200;

export type BlockLevel = 'sitewide' | 'seller';

export class BuyerBlockedError extends Error {
    readonly code = 'BUYER_BLOCKED';
    constructor(readonly level: BlockLevel) {
        super(level === 'sitewide' ? SITEWIDE_BLOCKED_MESSAGE : SELLER_BLOCKED_MESSAGE);
    }
}

export class MobileRequiredError extends Error {
    readonly code = 'MOBILE_REQUIRED';
    constructor() { super(MOBILE_REQUIRED_MESSAGE); }
}

export const isMobileRequiredError = (e: unknown) => (e as any)?.code === 'MOBILE_REQUIRED';

/** Firestore-safe key for an E.164 mobile: digits only, e.g. "61412345678". */
export function mobileKey(raw: unknown): string | null {
    const m = normalizeAuMobile(raw);
    return m ? m.slice(1) : null;
}

/** Doc id for a seller-level block: by mobile, or by account when there's no mobile (older orders). */
export function sellerBlockId(sellerId: string, who: { mobile?: string | null; uid?: string | null }): string | null {
    if (!sellerId || !/^[\w-]{1,128}$/.test(sellerId)) return null;
    const key = mobileKey(who.mobile);
    if (key) return `${sellerId}_${key}`;
    if (who.uid && /^[\w-]{1,128}$/.test(who.uid)) return `${sellerId}_u-${who.uid}`;
    return null;
}

export interface BlockEntry {
    id?: string;
    mobile?: string | null;
    uids?: string[] | null;
    sellerId?: string | null;
    reason?: string | null;
    buyerName?: string | null;
    createdAtMs?: number | null;
}

export interface BuyerIdentity {
    mobile?: string | null;
    uid?: string | null;
}

/** Does this block entry cover the buyer (same mobile, or one of the accounts seen with it)? */
export function matchesBlock(entry: BlockEntry | null | undefined, who: BuyerIdentity): boolean {
    if (!entry) return false;
    const m = normalizeAuMobile(who.mobile);
    if (m && normalizeAuMobile(entry.mobile) === m) return true;
    return !!who.uid && Array.isArray(entry.uids) && entry.uids.includes(who.uid);
}

/**
 * Which block (if any) stops this buyer requesting from these sellers. Sitewide wins, so the
 * buyer gets the sitewide wording. Seller blocks only count for the sellers in the request.
 */
export function findBlock(
    blocks: { sitewide: BlockEntry[]; seller: BlockEntry[] },
    who: BuyerIdentity,
    sellerIds: string[],
): BlockLevel | null {
    if (blocks.sitewide.some((b) => matchesBlock(b, who))) return 'sitewide';
    const sellers = new Set(sellerIds.filter(Boolean));
    if (blocks.seller.some((b) => !!b.sellerId && sellers.has(b.sellerId) && matchesBlock(b, who))) return 'seller';
    return null;
}

export function assertNotBlocked(blocks: { sitewide: BlockEntry[]; seller: BlockEntry[] }, who: BuyerIdentity, sellerIds: string[]) {
    const level = findBlock(blocks, who, sellerIds);
    if (level) throw new BuyerBlockedError(level);
}

export function cleanReason(raw: unknown): string | null {
    const v = String(raw ?? '').replace(/[\u0000-\u001f<>]/g, ' ').trim().replace(/\s+/g, ' ').slice(0, MAX_BLOCK_REASON);
    return v || null;
}

/** +61412345678 -> "0412 345 678" (anything else is returned as given). */
export function formatAuMobile(raw: unknown): string {
    const m = normalizeAuMobile(raw);
    if (!m) return String(raw ?? '');
    const local = `0${m.slice(3)}`;
    return `${local.slice(0, 4)} ${local.slice(4, 7)} ${local.slice(7)}`;
}

/** +61412345678 -> "0412 *** 678" (for showing a buyer which number is on their account). */
export function maskMobile(raw: unknown): string | null {
    const m = normalizeAuMobile(raw);
    if (!m) return null;
    const f = formatAuMobile(m);
    return `${f.slice(0, 4)} *** ${f.slice(9)}`;
}

export const telHref = (raw: unknown) => { const m = normalizeAuMobile(raw); return m ? `tel:${m}` : null; };
export const smsHref = (raw: unknown) => { const m = normalizeAuMobile(raw); return m ? `sms:${m}` : null; };

/** Unique non-empty uids (max 20) for a block entry. */
export function mergeUids(...lists: (string | null | undefined | (string | null | undefined)[])[]): string[] {
    const out = new Set<string>();
    for (const l of lists) for (const u of Array.isArray(l) ? l : [l]) if (u && /^[\w-]{1,128}$/.test(u)) out.add(u);
    return Array.from(out).slice(0, 20);
}

export interface MultiSellerBlock {
    mobile: string;
    sellerCount: number;
    reasons: string[];
    lastBlockedAtMs: number | null;
}

/** Numbers blocked by `threshold`+ different sellers that aren't blocked sitewide yet. */
export function multiSellerBlocks(sellerBlocks: BlockEntry[], sitewideMobiles: string[], threshold = MULTI_SELLER_BLOCK_THRESHOLD): MultiSellerBlock[] {
    const sitewide = new Set(sitewideMobiles.map((m) => normalizeAuMobile(m)).filter(Boolean) as string[]);
    const byMobile = new Map<string, { sellers: Set<string>; reasons: string[]; last: number | null }>();
    for (const b of sellerBlocks) {
        const m = normalizeAuMobile(b.mobile);
        if (!m || !b.sellerId || sitewide.has(m)) continue;
        const g = byMobile.get(m) || { sellers: new Set<string>(), reasons: [], last: null };
        g.sellers.add(b.sellerId);
        if (b.reason) g.reasons.push(b.reason);
        if (b.createdAtMs != null && (g.last == null || b.createdAtMs > g.last)) g.last = b.createdAtMs;
        byMobile.set(m, g);
    }
    return Array.from(byMobile.entries())
        .filter(([, g]) => g.sellers.size >= threshold)
        .map(([mobile, g]) => ({ mobile, sellerCount: g.sellers.size, reasons: g.reasons.slice(0, 5), lastBlockedAtMs: g.last }))
        .sort((a, b) => b.sellerCount - a.sellerCount || (b.lastBlockedAtMs || 0) - (a.lastBlockedAtMs || 0));
}

export interface BuyerHistory {
    completed: number;
    relisted: number;
    cancelled: number;
    expired: number;
    declined: number;
    open: number;
}

const DONE = new Set(['paid', 'completed', 'processing', 'shipped', 'delivered']);

/**
 * A buyer's past request outcomes across the site (counts only). `excludeOrderId` leaves out
 * the request being looked at.
 */
export function summariseBuyerHistory(orders: { id?: string; status?: string; cancelReason?: string | null; requestStatus?: string | null }[], excludeOrderId?: string): BuyerHistory {
    const h: BuyerHistory = { completed: 0, relisted: 0, cancelled: 0, expired: 0, declined: 0, open: 0 };
    for (const o of orders) {
        if (excludeOrderId && o.id === excludeOrderId) continue;
        const s = String(o.status || '');
        if (DONE.has(s)) h.completed++;
        else if (s === 'cancelled' && (o.cancelReason === 'seller_relisted' || o.requestStatus === 'seller_relisted')) h.relisted++;
        else if (s === 'cancelled' && (o.cancelReason === 'payment_timeout')) h.relisted++;
        else if (s === 'cancelled') h.cancelled++;
        else if (s === 'expired') h.expired++;
        else if (s === 'declined') h.declined++;
        else if (['requested', 'countered', 'awaiting_payment'].includes(s)) h.open++;
    }
    return h;
}

/** "2 completed · 1 relisted by seller", or "New buyer" when there's no history. */
export function formatBuyerHistory(h: BuyerHistory | null | undefined): string {
    if (!h) return '';
    const parts: string[] = [];
    if (h.completed) parts.push(`${h.completed} completed`);
    if (h.relisted) parts.push(`${h.relisted} relisted by seller`);
    if (h.cancelled) parts.push(`${h.cancelled} cancelled`);
    if (h.expired) parts.push(`${h.expired} expired`);
    if (h.declined) parts.push(`${h.declined} declined`);
    if (h.open) parts.push(`${h.open} open`);
    return parts.length ? parts.join(' · ') : 'New buyer';
}
