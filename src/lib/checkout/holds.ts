/**
 * 30-minute checkout holds (pure helpers, unit tested).
 *
 * A PayID order doesn't take stock away straight away. Instead it adds an entry to the
 * listing's `checkoutHolds` array: { orderId, qty, expiresAtMs }. Stock that is held by an
 * unexpired entry can't be bought by anyone else. Expiry is computed on read, so a hold that
 * runs out frees the item immediately, with no cron or write needed ("lazy" release).
 * The seller marking the order paid turns the hold into a real sale (quantity down, sold at 0).
 *
 * Entries hold no personal data: the order id is not a secret (the buyer's order page uses a
 * separate unguessable token).
 */

export const HOLD_MINUTES = 30;
export const HOLD_MS = HOLD_MINUTES * 60_000;
/** Max simultaneous active holds per guest email, mobile, device and IP. */
export const MAX_ACTIVE_HOLDS = 3;

export interface CheckoutHold {
    orderId: string;
    qty: number;
    expiresAtMs: number;
    /**
     * Seller-accepted request (src/lib/checkout/requests.ts): reserved for that buyer until the
     * seller marks it paid/collected or relists it. Never expires on its own.
     */
    reserved?: boolean;
}

/** expiresAtMs used for seller-accepted reservations (max JS date: effectively never). */
export const RESERVED_UNTIL_MS = 8_640_000_000_000_000;

export interface HoldableProduct {
    status?: string;
    quantity?: number;
    checkoutHolds?: CheckoutHold[] | null;
    /** Older per-listing holds (negotiation / enquiry). */
    holdExpiresAt?: any;
    heldBy?: string;
}

/** Timestamp | Date | ISO string | {seconds} | ms -> ms (or null). */
export function toMs(v: any): number | null {
    if (v == null) return null;
    if (typeof v === 'number') return Number.isFinite(v) ? v : null;
    if (v instanceof Date) return v.getTime();
    if (typeof v.toMillis === 'function') return v.toMillis();
    if (typeof v.toDate === 'function') return v.toDate().getTime();
    if (typeof v === 'string') { const t = Date.parse(v); return Number.isNaN(t) ? null : t; }
    if (typeof v.seconds === 'number') return v.seconds * 1000 + Math.floor((v.nanoseconds || 0) / 1e6);
    if (typeof v._seconds === 'number') return v._seconds * 1000 + Math.floor((v._nanoseconds || 0) / 1e6);
    return null;
}

export function holdExpiry(now: number = Date.now()): number {
    return now + HOLD_MS;
}

function validHolds(p: HoldableProduct): CheckoutHold[] {
    return Array.isArray(p?.checkoutHolds)
        ? p.checkoutHolds.filter((h) => h && typeof h.orderId === 'string' && Number(h.qty) > 0)
        : [];
}

/** Holds that are still running at `now` (optionally ignoring one order's own hold). */
export function activeHolds(p: HoldableProduct, now: number = Date.now(), excludeOrderId?: string): CheckoutHold[] {
    return validHolds(p).filter((h) => Number(h.expiresAtMs) > now && h.orderId !== excludeOrderId);
}

export function heldQuantity(p: HoldableProduct, now: number = Date.now(), excludeOrderId?: string): number {
    return activeHolds(p, now, excludeOrderId).reduce((s, h) => s + Number(h.qty || 0), 0);
}

/** Units that can still be bought right now (listing quantity minus active holds). */
export function availableQuantity(p: HoldableProduct, now: number = Date.now(), excludeOrderId?: string): number {
    const qty = p?.quantity == null ? 1 : Number(p.quantity) || 0;
    return Math.max(0, qty - heldQuantity(p, now, excludeOrderId));
}

/** True when a listing is live but every unit is held by someone's checkout. */
export function isOnCheckoutHold(p: HoldableProduct, now: number = Date.now()): boolean {
    if (!p || (p.status && p.status !== 'available')) return false;
    return activeHolds(p, now).length > 0 && availableQuantity(p, now) <= 0;
}

/** True when every unit is taken and at least one is a seller-accepted reservation ("Reserved"). */
export function isReservedForBuyer(p: HoldableProduct, now: number = Date.now()): boolean {
    return isOnCheckoutHold(p, now) && activeHolds(p, now).some((h) => h.reserved);
}

/** When the soonest timed hold ends (ms), for "On hold, frees up in mm:ss". Reservations don't count. */
export function holdEndsAt(p: HoldableProduct, now: number = Date.now()): number | null {
    const a = activeHolds(p, now).filter((h) => !h.reserved);
    return a.length ? Math.min(...a.map((h) => Number(h.expiresAtMs))) : null;
}

/** Keep only running holds (drops expired ones) and optionally remove an order's hold. */
export function pruneHolds(p: HoldableProduct, now: number = Date.now(), removeOrderId?: string): CheckoutHold[] {
    return activeHolds(p, now, removeOrderId).map((h) => ({
        orderId: h.orderId,
        qty: Number(h.qty),
        expiresAtMs: Number(h.expiresAtMs),
        ...(h.reserved ? { reserved: true } : {}),
    }));
}

/** Older single-listing hold (negotiation/enquiry) by someone other than `buyerKey`. */
export function heldByOtherLegacy(p: HoldableProduct, buyerKey: string | null, now: number = Date.now()): boolean {
    const exp = toMs(p?.holdExpiresAt);
    return !!exp && exp > now && (!buyerKey || p.heldBy !== buyerKey);
}

/**
 * Can `qty` units be held now? Throws a buyer-friendly error if not.
 * Expired holds are treated as available (they're pruned when the new hold is written).
 */
export function assertCanHold(p: HoldableProduct & { title?: string }, qty: number, now: number = Date.now(), buyerKey: string | null = null): void {
    const name = p?.title || 'This item';
    if (!Number.isInteger(qty) || qty < 1) throw new Error('Invalid item quantity.');
    if (!p || p.status !== 'available') throw new Error(`${name} is no longer available.`);
    if (heldByOtherLegacy(p, buyerKey, now)) throw new Error(`Sorry, ${name} is currently reserved by another buyer.`);
    if (availableQuantity(p, now) < qty) {
        throw new Error(activeHolds(p, now).length
            ? (activeHolds(p, now).some((h) => h.reserved)
                ? `Sorry, ${name} is reserved for another buyer.`
                : `Sorry, ${name} is on hold for another buyer right now. Check back in a few minutes.`)
            : `Not enough stock for ${name}.`);
    }
}

/** New holds array with this order's hold added (expired entries dropped). */
export function addHold(p: HoldableProduct, hold: CheckoutHold, now: number = Date.now()): CheckoutHold[] {
    return [...pruneHolds(p, now, hold.orderId), hold];
}

/**
 * Seller marks a hold-model order paid. Allowed while the hold runs, and also after it has
 * expired as long as nobody else has since held or bought the stock.
 * Returns the product patch values; throws if the stock is gone.
 */
export function resolvePaidStock(p: HoldableProduct & { title?: string }, orderId: string, qty: number, now: number = Date.now()) {
    const name = p?.title || 'This item';
    if (!p || p.status !== 'available') throw new Error(`${name} is no longer available, so this order can't be marked paid. Refund the buyer if they paid.`);
    const free = availableQuantity(p, now, orderId);
    if (free < qty) throw new Error(`${name} is now held or bought by another buyer, so this order can't be marked paid. Refund the buyer if they paid.`);
    const quantity = Math.max(0, (p.quantity == null ? 1 : Number(p.quantity) || 0) - qty);
    return { quantity, sold: quantity <= 0, checkoutHolds: pruneHolds(p, now, orderId) };
}

export interface HoldOrderLike {
    status?: string;
    holdExpiresAt?: any;
    paymentDueAt?: any;
}

/** An order still counts against hold limits while it's awaiting payment and unexpired. */
export function isActiveHoldOrder(o: HoldOrderLike, now: number = Date.now()): boolean {
    if (o?.status !== 'awaiting_payment') return false;
    const exp = toMs(o.holdExpiresAt) ?? toMs(o.paymentDueAt);
    return !!exp && exp > now;
}

export function countActiveHoldOrders(orders: HoldOrderLike[], now: number = Date.now()): number {
    return orders.filter((o) => isActiveHoldOrder(o, now)).length;
}

/** Throws if any identity (email, mobile, device, IP) already has MAX_ACTIVE_HOLDS running. */
export function assertHoldLimits(counts: Partial<Record<'email' | 'phone' | 'device' | 'ip', number>>, max: number = MAX_ACTIVE_HOLDS): void {
    const over = (Object.entries(counts) as [string, number][]).find(([, n]) => Number(n) >= max);
    if (over) {
        throw new Error(`You already have ${max} items on hold. Pay for or cancel one of them before holding another.`);
    }
}

/** mm:ss for a countdown. */
export function formatCountdown(msLeft: number): string {
    const s = Math.max(0, Math.ceil(msLeft / 1000));
    const m = Math.floor(s / 60);
    return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}
