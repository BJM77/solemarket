/**
 * Seller-approved purchase requests (pure helpers, unit tested; safe on client and server).
 *
 * A buyer (guest or signed in) sends a request on a listing: a Buy at the asking price or an
 * Offer below it. A request is NOT a sale or a hold: the listing stays buyable and offerable
 * by others until the seller accepts one. Requests are stored as `orders` documents with
 * `stockMode: 'request'` so the seller dashboard, the buyer's order pages and the existing
 * Mark paid / Mark collected flows all keep working.
 *
 * order.status            requestStatus     meaning
 * ----------------------  ----------------  -------------------------------------------------
 * requested               pending           waiting for the seller (expires after 24h)
 * countered               countered         seller declined the offer with a counter (24h)
 * declined                declined          seller (or the system, when sold out) declined
 * expired                 expired           nobody answered in time
 * awaiting_payment        accepted          seller accepted: item reserved, buyer pays/collects
 * cancelled               seller_relisted   seller relisted an accepted request
 * cancelled               cancelled         buyer cancelled (or seller cancelled)
 * paid / completed / ...  paid              seller marked it paid / collected
 *
 * Expiry is computed on read (`effectiveRequestStatus`), and a free scheduled job writes it.
 */
import { toMs } from './holds';

export const REQUEST_TTL_HOURS = 24;
export const REQUEST_TTL_MS = REQUEST_TTL_HOURS * 3600_000;
export const COUNTER_TTL_HOURS = 24;
export const COUNTER_TTL_MS = COUNTER_TTL_HOURS * 3600_000;
/** After accepting, nudge the seller (never auto-relist) after this long without payment. */
export const PAYID_NUDGE_HOURS = 24;
export const CASH_NUDGE_HOURS = 72;
/** Max open requests (pending, countered, or accepted but not yet paid/collected) per buyer. */
export const MAX_OPEN_REQUESTS = 3;

export type RequestType = 'buy' | 'offer';

export type RequestStatus =
    | 'pending'
    | 'countered'
    | 'declined'
    | 'expired'
    | 'accepted'
    | 'seller_relisted'
    | 'cancelled'
    | 'paid';

export type RequestAction =
    | 'accept'          // seller accepts a pending request
    | 'decline'         // seller declines a pending request
    | 'counter'         // seller declines an offer with a counter amount
    | 'accept_counter'  // buyer accepts the counter
    | 'decline_counter' // buyer declines the counter
    | 'buyer_cancel'    // buyer cancels a pending, countered or accepted request
    | 'relist'          // seller relists an accepted request
    | 'expire'          // system: unanswered request / counter ran out
    | 'auto_decline';   // system: another request took the last unit

export interface RequestLike {
    status?: string;
    stockMode?: string | null;
    requestType?: RequestType | string | null;
    requestExpiresAt?: any;
    counterExpiresAt?: any;
    counterAmount?: number | null;
    cancelReason?: string | null;
    holdExpiresAt?: any;
    paymentDueAt?: any;
    items?: { quantity?: number }[];
}

export const isRequestOrder = (o: RequestLike | null | undefined) => o?.stockMode === 'request';

const PAID_STATUSES = new Set(['paid', 'completed', 'processing', 'shipped', 'delivered']);

/** The request's status at `now`, with lazy expiry applied (nothing is written). */
export function effectiveRequestStatus(o: RequestLike, now: number = Date.now()): RequestStatus {
    const s = String(o?.status || '');
    if (s === 'requested') {
        const exp = toMs(o.requestExpiresAt);
        return exp != null && exp <= now ? 'expired' : 'pending';
    }
    if (s === 'countered') {
        const exp = toMs(o.counterExpiresAt);
        return exp != null && exp <= now ? 'expired' : 'countered';
    }
    if (s === 'declined') return 'declined';
    if (s === 'expired') return 'expired';
    if (s === 'awaiting_payment') return 'accepted';
    if (s === 'cancelled') return o.cancelReason === 'seller_relisted' ? 'seller_relisted' : 'cancelled';
    if (PAID_STATUSES.has(s)) return 'paid';
    return 'cancelled';
}

/** Buyer-facing label. */
export const REQUEST_STATUS_LABEL: Record<RequestStatus, string> = {
    pending: 'Waiting for the seller',
    countered: 'Seller sent a counter-offer',
    declined: 'Declined',
    expired: 'Expired',
    accepted: 'Accepted: reserved for you',
    seller_relisted: 'Relisted by the seller',
    cancelled: 'Cancelled',
    paid: 'Paid',
};

/** Seller-facing label. */
export const SELLER_REQUEST_LABEL: Record<RequestStatus, string> = {
    pending: 'New request',
    countered: 'Countered: waiting for buyer',
    declined: 'Declined',
    expired: 'Expired',
    accepted: 'Accepted: awaiting payment',
    seller_relisted: 'Relisted',
    cancelled: 'Cancelled',
    paid: 'Paid',
};

/**
 * Which order patch an action produces. Throws a friendly error if the action isn't allowed
 * from the request's current (effective) status. Stock is handled by the caller.
 */
export function nextRequestState(o: RequestLike, action: RequestAction, now: number = Date.now(), opts: { counterAmount?: number; askingPrice?: number; offerAmount?: number } = {}) {
    const cur = effectiveRequestStatus(o, now);
    const fail = (msg: string): never => { throw new Error(msg); };
    const gone = (what = 'request') => fail(cur === 'expired'
        ? `This ${what} has expired.`
        : `This ${what} is no longer open (${REQUEST_STATUS_LABEL[cur].toLowerCase()}).`);

    switch (action) {
        case 'accept':
            if (cur !== 'pending') gone();
            return { status: 'awaiting_payment', requestStatus: 'accepted' as const };
        case 'decline':
            if (cur !== 'pending') gone();
            return { status: 'declined', requestStatus: 'declined' as const, declineReason: 'declined_by_seller' };
        case 'counter': {
            if (cur !== 'pending') gone();
            if (o.requestType !== 'offer') fail('You can only counter an offer.');
            if (o.counterAmount != null) fail('You have already sent a counter-offer.');
            const c = Math.round(Number(opts.counterAmount) * 100) / 100;
            if (!Number.isFinite(c) || c <= 0) fail('Enter a counter-offer amount.');
            if (opts.offerAmount != null && c <= Number(opts.offerAmount)) fail('Your counter-offer must be more than the buyer offered.');
            if (opts.askingPrice != null && c > Number(opts.askingPrice)) fail('Your counter-offer can\'t be more than your asking price.');
            return { status: 'countered', requestStatus: 'countered' as const, counterAmount: c, counterExpiresAtMs: now + COUNTER_TTL_MS };
        }
        case 'accept_counter':
            if (cur !== 'countered') gone('counter-offer');
            return { status: 'awaiting_payment', requestStatus: 'accepted' as const };
        case 'decline_counter':
            if (cur !== 'countered') gone('counter-offer');
            return { status: 'declined', requestStatus: 'declined' as const, declineReason: 'counter_declined' };
        case 'buyer_cancel':
            if (cur === 'pending' || cur === 'countered') return { status: 'cancelled', requestStatus: 'cancelled' as const, cancelReason: 'cancelled_by_buyer', releasesStock: false };
            if (cur === 'accepted') return { status: 'cancelled', requestStatus: 'cancelled' as const, cancelReason: 'cancelled_by_buyer', releasesStock: true };
            return gone();
        case 'relist':
            if (cur !== 'accepted') fail('Only an accepted request can be relisted.');
            return { status: 'cancelled', requestStatus: 'seller_relisted' as const, cancelReason: 'seller_relisted', releasesStock: true };
        case 'expire':
            if (cur !== 'expired' || !['requested', 'countered'].includes(String(o.status))) fail('Not expired.');
            return { status: 'expired', requestStatus: 'expired' as const };
        case 'auto_decline':
            if (cur !== 'pending' && cur !== 'countered') gone();
            return { status: 'declined', requestStatus: 'declined' as const, declineReason: 'sold_to_another_buyer' };
        default:
            return fail('Unknown action.');
    }
}

/** Units in an order (defaults to 1 per line). */
export function orderUnits(o: RequestLike): number {
    const items = Array.isArray(o?.items) ? o.items : [];
    if (!items.length) return 1;
    return items.reduce((s, i) => s + Math.max(1, Number(i?.quantity || 1)), 0);
}

/**
 * Does this order use one of the buyer's 3 slots right now? Pending and countered requests
 * (until they expire) and accepted ones until they're paid or collected. Older 30-minute hold
 * orders count while their hold runs; older cash orders while awaiting payment.
 */
export function isOpenForLimit(o: RequestLike, now: number = Date.now()): boolean {
    const s = String(o?.status || '');
    if (s === 'requested' || s === 'countered') {
        const st = effectiveRequestStatus(o, now);
        return st === 'pending' || st === 'countered';
    }
    if (s !== 'awaiting_payment') return false;
    if (o.stockMode === 'hold') {
        const exp = toMs(o.holdExpiresAt) ?? toMs(o.paymentDueAt);
        return !!exp && exp > now;
    }
    return true;
}

export function countOpenUnits(orders: RequestLike[], now: number = Date.now()): number {
    return orders.filter((o) => isOpenForLimit(o, now)).reduce((s, o) => s + orderUnits(o), 0);
}

/**
 * Throws if any of the buyer's identities (uid, or email / mobile / device / IP for guests)
 * would go over MAX_OPEN_REQUESTS with `adding` more units.
 */
export function assertRequestLimit(counts: Partial<Record<string, number>>, adding: number = 1, max: number = MAX_OPEN_REQUESTS): void {
    const over = Object.values(counts).some((n) => Number(n || 0) + adding > max);
    if (over) {
        throw new Error(`You can have up to ${max} items requested or reserved at once. Cancel one, or wait for the seller to reply, before sending another.`);
    }
}

/** Validates an offer amount against the listing. Returns the rounded amount. */
export function validateOfferAmount(amount: unknown, listing: { price?: number; floorPrice?: number | null }): number {
    const a = Math.round(Number(amount) * 100) / 100;
    const price = Number(listing?.price || 0);
    if (!Number.isFinite(a) || a < 1) throw new Error('Enter an offer of at least $1.');
    if (price > 0 && a >= price) throw new Error('An offer must be below the asking price. To pay the full price, use Buy Now.');
    if (listing?.floorPrice && a < Number(listing.floorPrice)) {
        throw new Error(`This offer is below the seller's minimum of $${Number(listing.floorPrice).toLocaleString('en-AU')}.`);
    }
    return a;
}

/** How long the seller has been waiting on an accepted request, and whether to nudge them. */
export function acceptedWait(o: { acceptedAt?: any; paymentMethod?: string }, now: number = Date.now()) {
    const at = toMs(o?.acceptedAt);
    if (at == null) return { waitingMs: 0, nudge: false, nudgeAfterHours: o?.paymentMethod === 'cash' ? CASH_NUDGE_HOURS : PAYID_NUDGE_HOURS };
    const nudgeAfterHours = o?.paymentMethod === 'cash' ? CASH_NUDGE_HOURS : PAYID_NUDGE_HOURS;
    const waitingMs = Math.max(0, now - at);
    return { waitingMs, nudge: waitingMs >= nudgeAfterHours * 3600_000, nudgeAfterHours };
}

/** "3 h 20 min", "2 days 4 h", "5 min". */
export function formatWait(ms: number): string {
    const mins = Math.floor(Math.max(0, ms) / 60_000);
    if (mins < 60) return `${mins} min`;
    const h = Math.floor(mins / 60);
    if (h < 48) return `${h} h ${mins % 60} min`;
    return `${Math.floor(h / 24)} days ${h % 24} h`;
}

/** "in 5 h 10 min" style time left before a pending request or counter expires. */
export function timeLeft(o: RequestLike, now: number = Date.now()): number | null {
    const st = effectiveRequestStatus(o, now);
    const exp = st === 'pending' ? toMs(o.requestExpiresAt) : st === 'countered' ? toMs(o.counterExpiresAt) : null;
    return exp == null ? null : Math.max(0, exp - now);
}

/** Open requests on a listing, for the public "X requests" note (no buyer details). */
export function countOpenRequestsForListing(orders: RequestLike[], now: number = Date.now()): number {
    return orders.filter((o) => isRequestOrder(o) && ['pending', 'countered'].includes(effectiveRequestStatus(o, now))).length;
}

/**
 * Payment method for a guest request. Guests can always send a request: PayID when the seller
 * has one; otherwise cash for a Perth pickup, or (posted orders) PayID that the seller adds
 * before they accept.
 */
export function guestRequestPaymentMethod(sellerHasPayId: boolean, shippingMethod: 'pickup' | 'shipping'): 'payid' | 'cash' {
    if (sellerHasPayId) return 'payid';
    return shippingMethod === 'pickup' ? 'cash' : 'payid';
}

export type AcceptPaymentPlan = 'keep' | 'snapshot' | 'cash' | 'needs_payid';

/**
 * When a request is accepted (or a counter is sent/accepted): PayID orders need the seller's
 * PayID copied onto the order. 'snapshot' = copy it now, 'cash' = no PayID but it's a pickup,
 * so switch to cash on pickup, 'needs_payid' = posted order and the seller has no PayID yet.
 */
export function planAcceptPayment(
    o: { paymentMethod?: string | null; shippingMethod?: string | null },
    hasSnapshot: boolean,
    sellerHasPayId: boolean,
): AcceptPaymentPlan {
    if (o?.paymentMethod !== 'payid' || hasSnapshot) return 'keep';
    if (sellerHasPayId) return 'snapshot';
    return o?.shippingMethod === 'shipping' ? 'needs_payid' : 'cash';
}

export const NEEDS_PAYID_MESSAGE = 'This buyer wants it posted, so they need to pay by PayID. Add your PayID under Sell > Payouts, then accept (or decline the request).';
