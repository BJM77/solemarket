import { describe, it, expect, beforeEach } from 'vitest';
import { listGuestOrders, saveGuestOrder, removeGuestOrder, isLocalOrderActive, localOrderLabel, GUEST_ORDERS_KEY } from './guest-orders-local';

const tok = (c: string) => c.repeat(43);

describe('guest orders on this device', () => {
    beforeEach(() => localStorage.clear());

    it('saves, updates status without losing createdAt, lists newest first', () => {
        saveGuestOrder({ token: tok('a'), title: 'A', createdAtMs: 1000, holdExpiresAtMs: 5000, status: 'awaiting_payment' });
        saveGuestOrder({ token: tok('b'), title: 'B', createdAtMs: 2000 });
        saveGuestOrder({ token: tok('a'), title: 'A', createdAtMs: 9999, status: 'paid' });
        const list = listGuestOrders(3000);
        expect(list.map((o) => o.title)).toEqual(['B', 'A']);
        expect(list[1]).toMatchObject({ status: 'paid', createdAtMs: 1000 });
    });
    it('active only while awaiting payment and the hold is running', () => {
        expect(isLocalOrderActive({ token: tok('a'), title: 'A', createdAtMs: 0, holdExpiresAtMs: 5000, status: 'awaiting_payment' }, 4000)).toBe(true);
        expect(isLocalOrderActive({ token: tok('a'), title: 'A', createdAtMs: 0, holdExpiresAtMs: 5000, status: 'awaiting_payment' }, 6000)).toBe(false);
        expect(isLocalOrderActive({ token: tok('a'), title: 'A', createdAtMs: 0, holdExpiresAtMs: 5000, status: 'cancelled' }, 4000)).toBe(false);
    });
    it('requests: pending (for 24h), countered and accepted are active; labels per status', () => {
        const base = { token: tok('a'), title: 'A', createdAtMs: 0 };
        const day = 24 * 3600_000;
        expect(isLocalOrderActive({ ...base, status: 'requested' }, day - 1)).toBe(true);
        expect(isLocalOrderActive({ ...base, status: 'requested' }, day)).toBe(false);
        expect(isLocalOrderActive({ ...base, status: 'countered' }, day * 3)).toBe(true);
        expect(isLocalOrderActive({ ...base, status: 'awaiting_payment', requestStatus: 'accepted' }, day * 3)).toBe(true);
        expect(isLocalOrderActive({ ...base, status: 'declined' }, 1)).toBe(false);
        expect(localOrderLabel({ ...base, status: 'requested' }, 1)).toBe('Waiting for the seller');
        expect(localOrderLabel({ ...base, status: 'countered' }, 1)).toBe('Counter-offer to answer');
        expect(localOrderLabel({ ...base, status: 'awaiting_payment', requestStatus: 'accepted' }, 1)).toBe('Accepted: pay the seller');
        expect(localOrderLabel({ ...base, status: 'cancelled', requestStatus: 'seller_relisted' }, 1)).toBe('Relisted by the seller');
        expect(localOrderLabel({ ...base, status: 'paid' }, 1)).toBe('Paid');
    });
    it('ignores junk and forgets orders', () => {
        localStorage.setItem(GUEST_ORDERS_KEY, JSON.stringify([{ token: '../x' }, 'junk', { token: tok('c'), title: 'C', createdAtMs: 1 }]));
        expect(listGuestOrders(2).map((o) => o.title)).toEqual(['C']);
        removeGuestOrder(tok('c'));
        expect(listGuestOrders(2)).toEqual([]);
        localStorage.setItem(GUEST_ORDERS_KEY, '{not json');
        expect(listGuestOrders()).toEqual([]);
    });
});
