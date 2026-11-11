import { describe, it, expect } from 'vitest';
import {
    HOLD_MS, MAX_ACTIVE_HOLDS, activeHolds, addHold, assertCanHold, assertHoldLimits, availableQuantity,
    countActiveHoldOrders, formatCountdown, holdEndsAt, holdExpiry, isActiveHoldOrder, isOnCheckoutHold,
    pruneHolds, resolvePaidStock, toMs,
} from './holds';

const T = Date.parse('2026-11-11T00:00:00Z');
const live = (extra: any = {}) => ({ title: 'Jordan 1', status: 'available', quantity: 1, ...extra });

describe('hold expiry', () => {
    it('holds last 30 minutes', () => {
        expect(holdExpiry(T) - T).toBe(30 * 60_000);
        expect(HOLD_MS).toBe(1_800_000);
    });

    it('an active hold blocks the last unit; an expired one frees it with no write', () => {
        const p = live({ checkoutHolds: [{ orderId: 'o1', qty: 1, expiresAtMs: T + 60_000 }] });
        expect(isOnCheckoutHold(p, T)).toBe(true);
        expect(availableQuantity(p, T)).toBe(0);
        expect(() => assertCanHold(p, 1, T)).toThrow(/on hold for another buyer/);
        // One ms after expiry the same document reads as available.
        expect(isOnCheckoutHold(p, T + 60_001)).toBe(false);
        expect(availableQuantity(p, T + 60_001)).toBe(1);
        expect(() => assertCanHold(p, 1, T + 60_001)).not.toThrow();
    });

    it('expiry boundary: a hold ending exactly now is expired', () => {
        const p = live({ checkoutHolds: [{ orderId: 'o1', qty: 1, expiresAtMs: T }] });
        expect(activeHolds(p, T)).toHaveLength(0);
    });

    it('multi-quantity listings only block the held units', () => {
        const p = live({ quantity: 3, checkoutHolds: [{ orderId: 'a', qty: 1, expiresAtMs: T + 1000 }, { orderId: 'b', qty: 1, expiresAtMs: T + 2000 }] });
        expect(availableQuantity(p, T)).toBe(1);
        expect(isOnCheckoutHold(p, T)).toBe(false);
        expect(() => assertCanHold(p, 2, T)).toThrow();
        expect(holdEndsAt(p, T)).toBe(T + 1000);
    });

    it('sold, draft or reserved listings cannot be held', () => {
        expect(() => assertCanHold(live({ status: 'sold' }), 1, T)).toThrow(/no longer available/);
        expect(() => assertCanHold(live({ status: 'reserved' }), 1, T)).toThrow();
        expect(() => assertCanHold(live({ quantity: 0 }), 1, T)).toThrow(/Not enough stock/);
        expect(() => assertCanHold(live(), 0, T)).toThrow(/quantity/);
    });

    it('respects the older negotiation hold unless it is the same buyer', () => {
        const p = live({ heldBy: 'u1', holdExpiresAt: new Date(T + 5000) });
        expect(() => assertCanHold(p, 1, T, 'u2')).toThrow(/reserved by another buyer/);
        expect(() => assertCanHold(p, 1, T, 'u1')).not.toThrow();
        expect(() => assertCanHold(p, 1, T + 6000, null)).not.toThrow();
    });

    it('addHold drops expired entries and replaces the same order', () => {
        const p = live({ quantity: 2, checkoutHolds: [{ orderId: 'old', qty: 1, expiresAtMs: T - 1 }, { orderId: 'x', qty: 1, expiresAtMs: T + 10 }] });
        const next = addHold(p, { orderId: 'x', qty: 1, expiresAtMs: T + 99 }, T);
        expect(next).toEqual([{ orderId: 'x', qty: 1, expiresAtMs: T + 99 }]);
        expect(pruneHolds(p, T)).toEqual([{ orderId: 'x', qty: 1, expiresAtMs: T + 10 }]);
    });
});

describe('two buyers racing for the last unit', () => {
    // Firestore re-runs the losing transaction against the committed state; this replays that.
    it('the second transaction sees the first hold and fails', () => {
        const doc: any = live();
        assertCanHold(doc, 1, T);
        doc.checkoutHolds = addHold(doc, { orderId: 'A', qty: 1, expiresAtMs: holdExpiry(T) }, T);
        expect(() => assertCanHold(doc, 1, T + 10)).toThrow(/on hold/);
    });
});

describe('seller marks paid', () => {
    it('while held: stock goes down and the listing sells out', () => {
        const p = live({ checkoutHolds: [{ orderId: 'o1', qty: 1, expiresAtMs: T + 1000 }] });
        expect(resolvePaidStock(p, 'o1', 1, T)).toEqual({ quantity: 0, sold: true, checkoutHolds: [] });
    });

    it('after expiry, allowed if nobody else holds it', () => {
        const p = live({ checkoutHolds: [{ orderId: 'o1', qty: 1, expiresAtMs: T - 1000 }] });
        expect(resolvePaidStock(p, 'o1', 1, T).sold).toBe(true);
    });

    it('after expiry, refused if another buyer now holds it or it sold', () => {
        const p = live({ checkoutHolds: [{ orderId: 'o2', qty: 1, expiresAtMs: T + 1000 }] });
        expect(() => resolvePaidStock(p, 'o1', 1, T)).toThrow(/another buyer/);
        expect(() => resolvePaidStock(live({ status: 'sold', quantity: 0 }), 'o1', 1, T)).toThrow(/no longer available/);
    });

    it('multi-quantity: keeps the listing live', () => {
        const p = live({ quantity: 3, checkoutHolds: [{ orderId: 'o1', qty: 1, expiresAtMs: T + 1000 }] });
        expect(resolvePaidStock(p, 'o1', 1, T)).toEqual({ quantity: 2, sold: false, checkoutHolds: [] });
    });
});

describe('hold limits', () => {
    const order = (status: string, exp: number) => ({ status, holdExpiresAt: { toMillis: () => exp } });

    it('counts only unexpired orders awaiting payment', () => {
        const orders = [order('awaiting_payment', T + 1), order('awaiting_payment', T - 1), order('paid', T + 1), order('cancelled', T + 1)];
        expect(countActiveHoldOrders(orders, T)).toBe(1);
        expect(isActiveHoldOrder({ status: 'awaiting_payment', paymentDueAt: new Date(T + 5) }, T)).toBe(true);
    });

    it(`blocks the ${MAX_ACTIVE_HOLDS + 1}th hold for any identity`, () => {
        expect(() => assertHoldLimits({ email: 2, phone: 2, device: 0, ip: 2 })).not.toThrow();
        expect(() => assertHoldLimits({ email: 0, phone: 3 })).toThrow(/already have 3 items on hold/);
        expect(() => assertHoldLimits({ ip: 3 })).toThrow();
    });
});

describe('helpers', () => {
    it('toMs handles Firestore shapes', () => {
        expect(toMs({ seconds: 10, nanoseconds: 5e6 })).toBe(10_005);
        expect(toMs({ _seconds: 1, _nanoseconds: 0 })).toBe(1000);
        expect(toMs('2026-11-11T00:00:00Z')).toBe(T);
        expect(toMs(null)).toBeNull();
    });
    it('formatCountdown', () => {
        expect(formatCountdown(30 * 60_000)).toBe('30:00');
        expect(formatCountdown(61_001)).toBe('01:02');
        expect(formatCountdown(-5)).toBe('00:00');
    });
});
