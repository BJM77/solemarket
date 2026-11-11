import { describe, it, expect } from 'vitest';
import {
    COUNTER_TTL_MS, MAX_OPEN_REQUESTS, REQUEST_TTL_MS, acceptedWait, assertRequestLimit, countOpenRequestsForListing,
    countOpenUnits, effectiveRequestStatus, isOpenForLimit, nextRequestState, orderUnits, timeLeft, validateOfferAmount,
} from './requests';
import { RESERVED_UNTIL_MS, addHold, assertCanHold, availableQuantity, isOnCheckoutHold, isReservedForBuyer, pruneHolds, resolvePaidStock } from './holds';

const T = Date.parse('2026-11-11T00:00:00Z');
const H = 3600_000;
const req = (extra: any = {}) => ({ stockMode: 'request', status: 'requested', requestType: 'buy', requestExpiresAt: T + REQUEST_TTL_MS, items: [{ quantity: 1 }], ...extra });
const offer = (extra: any = {}) => req({ requestType: 'offer', offerAmount: 80, askingPrice: 100, counterAmount: null, ...extra });

describe('request state machine', () => {
    it('pending -> accepted', () => {
        expect(effectiveRequestStatus(req(), T)).toBe('pending');
        expect(nextRequestState(req(), 'accept', T)).toMatchObject({ status: 'awaiting_payment', requestStatus: 'accepted' });
        expect(effectiveRequestStatus({ ...req(), status: 'awaiting_payment' }, T)).toBe('accepted');
    });

    it('pending -> declined', () => {
        expect(nextRequestState(req(), 'decline', T)).toMatchObject({ status: 'declined', requestStatus: 'declined', declineReason: 'declined_by_seller' });
        expect(effectiveRequestStatus({ status: 'declined' }, T)).toBe('declined');
    });

    it('offer -> countered -> accepted at the counter price', () => {
        const c = nextRequestState(offer(), 'counter', T, { counterAmount: 90, askingPrice: 100, offerAmount: 80 }) as any;
        expect(c).toMatchObject({ status: 'countered', requestStatus: 'countered', counterAmount: 90 });
        expect(c.counterExpiresAtMs).toBe(T + COUNTER_TTL_MS);
        const countered = offer({ status: 'countered', counterAmount: 90, counterExpiresAt: c.counterExpiresAtMs });
        expect(effectiveRequestStatus(countered, T + H)).toBe('countered');
        expect(nextRequestState(countered, 'accept_counter', T + H)).toMatchObject({ status: 'awaiting_payment', requestStatus: 'accepted' });
        // The seller can't accept or counter again while the buyer decides.
        expect(() => nextRequestState(countered, 'accept', T + H)).toThrow(/no longer open/);
        expect(() => nextRequestState(countered, 'counter', T + H, { counterAmount: 95 })).toThrow();
    });

    it('countered -> declined by the buyer', () => {
        const countered = offer({ status: 'countered', counterAmount: 90, counterExpiresAt: T + COUNTER_TTL_MS });
        expect(nextRequestState(countered, 'decline_counter', T)).toMatchObject({ status: 'declined', declineReason: 'counter_declined' });
    });

    it('counter rules: offers only, one round, between the offer and the asking price', () => {
        expect(() => nextRequestState(req(), 'counter', T, { counterAmount: 90 })).toThrow(/only counter an offer/);
        expect(() => nextRequestState(offer({ counterAmount: 85 }), 'counter', T, { counterAmount: 90 })).toThrow(/already sent/);
        expect(() => nextRequestState(offer(), 'counter', T, { counterAmount: 80, offerAmount: 80, askingPrice: 100 })).toThrow(/more than the buyer offered/);
        expect(() => nextRequestState(offer(), 'counter', T, { counterAmount: 120, offerAmount: 80, askingPrice: 100 })).toThrow(/more than your asking price/);
        expect(() => nextRequestState(offer(), 'counter', T, { counterAmount: NaN })).toThrow(/Enter a counter/);
    });

    it('expiry: pending after 24h, counters 24h after they were sent (lazy, on read)', () => {
        expect(effectiveRequestStatus(req(), T + REQUEST_TTL_MS - 1)).toBe('pending');
        expect(effectiveRequestStatus(req(), T + REQUEST_TTL_MS)).toBe('expired');
        expect(() => nextRequestState(req(), 'accept', T + REQUEST_TTL_MS)).toThrow(/expired/);
        expect(nextRequestState(req(), 'expire', T + REQUEST_TTL_MS)).toMatchObject({ status: 'expired' });
        expect(() => nextRequestState(req(), 'expire', T)).toThrow(/Not expired/);
        const countered = offer({ status: 'countered', counterAmount: 90, counterExpiresAt: T + COUNTER_TTL_MS });
        expect(effectiveRequestStatus(countered, T + COUNTER_TTL_MS)).toBe('expired');
        expect(() => nextRequestState(countered, 'accept_counter', T + COUNTER_TTL_MS)).toThrow(/expired/);
        expect(timeLeft(req(), T + H)).toBe(REQUEST_TTL_MS - H);
        expect(timeLeft({ status: 'declined' }, T)).toBeNull();
        // Timestamps in any shape work (Firestore Timestamp, ISO string).
        expect(effectiveRequestStatus(req({ requestExpiresAt: { toMillis: () => T } }), T)).toBe('expired');
        expect(effectiveRequestStatus(req({ requestExpiresAt: new Date(T + 1).toISOString() }), T)).toBe('pending');
    });

    it('accepted -> relisted by the seller, and only accepted requests can be relisted', () => {
        const accepted = req({ status: 'awaiting_payment' });
        expect(nextRequestState(accepted, 'relist', T)).toMatchObject({ status: 'cancelled', requestStatus: 'seller_relisted', cancelReason: 'seller_relisted', releasesStock: true });
        expect(effectiveRequestStatus({ status: 'cancelled', cancelReason: 'seller_relisted' }, T)).toBe('seller_relisted');
        expect(() => nextRequestState(req(), 'relist', T)).toThrow(/Only an accepted/);
    });

    it('buyer can cancel pending, countered or accepted; accepted releases stock', () => {
        expect(nextRequestState(req(), 'buyer_cancel', T)).toMatchObject({ status: 'cancelled', releasesStock: false });
        expect(nextRequestState(offer({ status: 'countered', counterAmount: 90, counterExpiresAt: T + H }), 'buyer_cancel', T)).toMatchObject({ releasesStock: false });
        expect(nextRequestState(req({ status: 'awaiting_payment' }), 'buyer_cancel', T)).toMatchObject({ releasesStock: true });
        expect(() => nextRequestState({ status: 'paid', stockMode: 'request' }, 'buyer_cancel', T)).toThrow();
        expect(() => nextRequestState({ status: 'declined', stockMode: 'request' }, 'buyer_cancel', T)).toThrow();
    });

    it('paid states read as paid; auto-decline only hits open requests', () => {
        for (const s of ['paid', 'completed', 'shipped', 'delivered', 'processing']) expect(effectiveRequestStatus({ status: s }, T)).toBe('paid');
        expect(nextRequestState(req(), 'auto_decline', T)).toMatchObject({ declineReason: 'sold_to_another_buyer' });
        expect(() => nextRequestState(req({ status: 'awaiting_payment' }), 'auto_decline', T)).toThrow();
    });
});

describe('3 open requests per buyer', () => {
    it('counts pending, countered and accepted-but-unpaid; not expired, declined, relisted or paid', () => {
        const orders = [
            req(),                                                              // pending: counts
            offer({ status: 'countered', counterAmount: 90, counterExpiresAt: T + H }), // countered: counts
            req({ status: 'awaiting_payment' }),                                // accepted, unpaid: counts
            req({ requestExpiresAt: T - 1 }),                                   // expired on read: no
            req({ status: 'declined' }),
            req({ status: 'cancelled', cancelReason: 'seller_relisted' }),
            req({ status: 'paid' }),
            req({ status: 'completed' }),
        ];
        expect(orders.map((o) => isOpenForLimit(o, T))).toEqual([true, true, true, false, false, false, false, false]);
        expect(countOpenUnits(orders, T)).toBe(3);
    });

    it('older 30-minute holds count while running; older cash orders while unpaid', () => {
        expect(isOpenForLimit({ status: 'awaiting_payment', stockMode: 'hold', holdExpiresAt: T + 1000 }, T)).toBe(true);
        expect(isOpenForLimit({ status: 'awaiting_payment', stockMode: 'hold', holdExpiresAt: T - 1000 }, T)).toBe(false);
        expect(isOpenForLimit({ status: 'awaiting_payment' }, T)).toBe(true);
    });

    it('counts units, so a cart of 2 uses 2 slots', () => {
        expect(orderUnits({ items: [{ quantity: 2 }, { quantity: 1 }] })).toBe(3);
        expect(orderUnits({})).toBe(1);
        expect(countOpenUnits([req({ items: [{ quantity: 2 }] })], T)).toBe(2);
    });

    it('blocks the 4th, on any identity (uid, email, mobile, device, IP)', () => {
        expect(MAX_OPEN_REQUESTS).toBe(3);
        expect(() => assertRequestLimit({ buyerId: 2 }, 1)).not.toThrow();
        expect(() => assertRequestLimit({ buyerId: 3 }, 1)).toThrow(/up to 3 items/);
        expect(() => assertRequestLimit({ guestEmailHash: 0, guestDeviceHash: 3 }, 1)).toThrow();
        expect(() => assertRequestLimit({ buyerId: 1 }, 3)).toThrow();
        expect(() => assertRequestLimit({}, 3)).not.toThrow();
    });
});

describe('offers and listing counts', () => {
    it('offers must be below asking and at or above the floor', () => {
        expect(validateOfferAmount('79.999', { price: 100 })).toBe(80);
        expect(() => validateOfferAmount(100, { price: 100 })).toThrow(/below the asking price/);
        expect(() => validateOfferAmount(0.5, { price: 100 })).toThrow(/at least \$1/);
        expect(() => validateOfferAmount('abc', { price: 100 })).toThrow();
        expect(() => validateOfferAmount(50, { price: 100, floorPrice: 60 })).toThrow(/minimum/);
    });

    it('"X requests" counts open requests only', () => {
        const list = [req(), offer({ status: 'countered', counterAmount: 90, counterExpiresAt: T + H }), req({ requestExpiresAt: T - 1 }), req({ status: 'awaiting_payment' }), { status: 'awaiting_payment' }];
        expect(countOpenRequestsForListing(list, T)).toBe(2);
    });

    it('nudges after 24h for PayID and 72h for cash pickup, never auto-relists', () => {
        expect(acceptedWait({ acceptedAt: T, paymentMethod: 'payid' }, T + 23 * H).nudge).toBe(false);
        expect(acceptedWait({ acceptedAt: T, paymentMethod: 'payid' }, T + 24 * H).nudge).toBe(true);
        expect(acceptedWait({ acceptedAt: T, paymentMethod: 'cash' }, T + 48 * H).nudge).toBe(false);
        expect(acceptedWait({ acceptedAt: T, paymentMethod: 'cash' }, T + 72 * H)).toMatchObject({ nudge: true, nudgeAfterHours: 72, waitingMs: 72 * H });
    });
});

describe('accepting reserves stock (one accepted request per unit)', () => {
    const live = (extra: any = {}) => ({ title: 'Jordan 1', status: 'available', quantity: 1, ...extra });
    const reserve = (p: any, orderId: string) => addHold(p, { orderId, qty: 1, expiresAtMs: RESERVED_UNTIL_MS, reserved: true }, T);

    it('the last unit can only be reserved once; it reads as Reserved, never expires', () => {
        const p = live();
        const holds = reserve(p, 'a');
        const after = { ...p, checkoutHolds: holds };
        expect(availableQuantity(after, T)).toBe(0);
        expect(isReservedForBuyer(after, T)).toBe(true);
        expect(isReservedForBuyer(after, T + 365 * 24 * H)).toBe(true);
        expect(() => assertCanHold(after, 1, T)).toThrow(/reserved for another buyer/);
        // pruneHolds keeps the reservation flag.
        expect(pruneHolds(after, T)[0]).toMatchObject({ orderId: 'a', reserved: true });
    });

    it('multi-quantity listings take one reservation per unit', () => {
        const p = live({ quantity: 2 });
        const one = { ...p, checkoutHolds: reserve(p, 'a') };
        expect(availableQuantity(one, T)).toBe(1);
        expect(isOnCheckoutHold(one, T)).toBe(false);
        const two = { ...one, checkoutHolds: reserve(one, 'b') };
        expect(availableQuantity(two, T)).toBe(0);
        expect(() => assertCanHold(two, 1, T)).toThrow();
    });

    it('relist frees the unit; mark paid sells it', () => {
        const p = live();
        const after = { ...p, checkoutHolds: reserve(p, 'a') };
        expect(availableQuantity({ ...after, checkoutHolds: pruneHolds(after, T, 'a') }, T)).toBe(1);
        expect(resolvePaidStock(after, 'a', 1, T)).toMatchObject({ quantity: 0, sold: true, checkoutHolds: [] });
        expect(() => resolvePaidStock(after, 'b', 1, T)).toThrow(/held or bought by another buyer/);
    });
});
