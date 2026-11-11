import { describe, it, expect, beforeEach } from 'vitest';
import { listGuestOrders, saveGuestOrder, removeGuestOrder, isLocalOrderActive, GUEST_ORDERS_KEY } from './guest-orders-local';

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
    it('ignores junk and forgets orders', () => {
        localStorage.setItem(GUEST_ORDERS_KEY, JSON.stringify([{ token: '../x' }, 'junk', { token: tok('c'), title: 'C', createdAtMs: 1 }]));
        expect(listGuestOrders(2).map((o) => o.title)).toEqual(['C']);
        removeGuestOrder(tok('c'));
        expect(listGuestOrders(2)).toEqual([]);
        localStorage.setItem(GUEST_ORDERS_KEY, '{not json');
        expect(listGuestOrders()).toEqual([]);
    });
});
