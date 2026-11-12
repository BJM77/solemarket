import { describe, it, expect, vi, beforeEach } from 'vitest';

/** Tiny in-memory Firestore: docs, equality / array-contains queries, transactions. */
const store = vi.hoisted(() => new Map<string, Map<string, any>>());
const fake = vi.hoisted(() => {
    const col = (name: string) => {
        if (!store.has(name)) store.set(name, new Map());
        return store.get(name)!;
    };
    const snap = (name: string, id: string) => {
        const data = col(name).get(id);
        const ref = docRef(name, id);
        return { id, exists: data !== undefined, data: () => (data === undefined ? undefined : { ...data }), ref };
    };
    function docRef(name: string, id: string): any {
        return {
            id, __doc: true,
            get: async () => snap(name, id),
            set: async (d: any, o?: any) => { col(name).set(id, o?.merge ? { ...(col(name).get(id) || {}), ...d } : { ...d }); },
            update: async (d: any) => { col(name).set(id, { ...(col(name).get(id) || {}), ...d }); },
            delete: async () => { col(name).delete(id); },
            collection: (sub: string) => collection(`${name}/${id}/${sub}`),
        };
    }
    function query(name: string, filters: [string, string, any][], lim = Infinity): any {
        return {
            where: (f: string, op: string, v: any) => query(name, [...filters, [f, op, v]], lim),
            limit: (n: number) => query(name, filters, n),
            get: async () => {
                const docs = Array.from(col(name).entries())
                    .filter(([, d]) => filters.every(([f, op, v]) => (op === 'array-contains' ? Array.isArray(d[f]) && d[f].includes(v) : d[f] === v)))
                    .slice(0, lim)
                    .map(([id]) => snap(name, id));
                return { docs, size: docs.length, empty: !docs.length };
            },
        };
    }
    function collection(name: string): any {
        return { doc: (id?: string) => docRef(name, id || Math.random().toString(36).slice(2)), ...query(name, []) };
    }
    const db = {
        collection,
        getAll: async (...refs: any[]) => Promise.all(refs.map((r) => r.get())),
        runTransaction: async (fn: any) => fn({
            get: (x: any) => x.get(),
            getAll: (...refs: any[]) => Promise.all(refs.map((r) => r.get())),
            update: (ref: any, d: any) => ref.update(d),
            set: (ref: any, d: any, o?: any) => ref.set(d, o),
        }),
    };
    return { db };
});

vi.mock('@/lib/firebase/admin', () => ({ firestoreDb: fake.db }));
const notify = vi.hoisted(() => ({ sendNotification: vi.fn(async () => {}), pushOrderToSeller: vi.fn(async () => {}), pushRequestToBuyer: vi.fn(async () => {}), applyOrderTransition: vi.fn(async () => ({})) }));
vi.mock('@/services/notifications', () => ({ sendNotification: notify.sendNotification }));
vi.mock('@/lib/notifications/push-server', () => ({ pushOrderToSeller: notify.pushOrderToSeller, pushRequestToBuyer: notify.pushRequestToBuyer }));
vi.mock('@/lib/payments/server', () => ({ applyOrderTransition: notify.applyOrderTransition }));

import {
    adminBlockMobile, adminListBlocks, adminUnblockMobile, assertBuyerNotBlocked, buyerHistoryForOrders, getBuyerMobileStatus,
    listSellerBlocks, resolveBuyerMobile, sellerBlockBuyer, sellerUnblockBuyer,
} from './blocks-server';
import { SELLER_BLOCKED_MESSAGE, SITEWIDE_BLOCKED_MESSAGE } from './blocks';

const put = (c: string, id: string, d: any) => { if (!store.has(c)) store.set(c, new Map()); store.get(c)!.set(id, d); };
const get = (c: string, id: string) => store.get(c)?.get(id);
const ADMIN = { uid: 'admin1', role: 'superadmin' };

beforeEach(() => {
    store.clear();
    vi.clearAllMocks();
});

describe('seller-level blocks', () => {
    beforeEach(() => {
        put('orders', 'o1', { sellerId: 'sA', buyerPhone: '+61400000001', buyerId: null, buyerName: 'Guest', status: 'requested', stockMode: 'request', items: [{ title: 'Card' }] });
        put('orders', 'o2', { sellerId: 'sA', buyerPhone: '+61400000001', status: 'countered', stockMode: 'request', items: [{ title: 'Card 2' }] });
        put('orders', 'o3', { sellerId: 'sA', buyerPhone: '+61400000001', status: 'awaiting_payment', stockMode: 'request' });
        put('orders', 'o4', { sellerId: 'sB', buyerPhone: '+61400000001', status: 'requested', stockMode: 'request' });
        put('orders', 'o5', { sellerId: 'sA', buyerPhone: '+61400000009', status: 'requested', stockMode: 'request' });
        put('orders', 'o6', { sellerId: 'sC', buyerPhone: '+61400000001', buyerId: 'acct1', status: 'completed' });
    });

    it('only the seller (or an admin) can block, and blocking declines that buyer\'s open requests to that seller only', async () => {
        await expect(sellerBlockBuyer({ uid: 'sB' }, 'o1')).rejects.toThrow(/Only the seller/);
        const r = await sellerBlockBuyer({ uid: 'sA' }, 'o1', 'no-show');
        expect(r.id).toBe('sA_61400000001');
        expect(get('seller_blocks', 'sA_61400000001')).toMatchObject({ sellerId: 'sA', mobile: '+61400000001', reason: 'no-show', uids: ['acct1'] });
        expect(get('orders', 'o1')).toMatchObject({ status: 'declined', declineReason: 'seller_blocked' });
        expect(get('orders', 'o2')).toMatchObject({ status: 'declined' });
        expect(notify.applyOrderTransition).toHaveBeenCalledWith('o3', 'cancel', { uid: 'sA' }, 'seller_blocked');
        expect(get('orders', 'o4').status).toBe('requested'); // other seller untouched
        expect(get('orders', 'o5').status).toBe('requested'); // other buyer untouched
        expect(r.declined).toBe(3);
    });

    it('blocks new requests to that seller by mobile or by an account seen with it, not to other sellers', async () => {
        await sellerBlockBuyer({ uid: 'sA' }, 'o1');
        await expect(assertBuyerNotBlocked({ mobile: '0400 000 001' }, ['sA'])).rejects.toThrow(SELLER_BLOCKED_MESSAGE);
        await expect(assertBuyerNotBlocked({ uid: 'acct1', mobile: '0499 999 999' }, ['sA'])).rejects.toThrow(SELLER_BLOCKED_MESSAGE);
        await expect(assertBuyerNotBlocked({ mobile: '0400 000 001' }, ['sB'])).resolves.toBeUndefined();
        await expect(assertBuyerNotBlocked({ mobile: '0400 000 002' }, ['sA'])).resolves.toBeUndefined();
    });

    it('lists and unblocks (own blocks only)', async () => {
        await sellerBlockBuyer({ uid: 'sA' }, 'o1', 'late');
        const list = await listSellerBlocks('sA');
        expect(list).toEqual([expect.objectContaining({ id: 'sA_61400000001', mobile: '0400 000 001', reason: 'late', buyerName: 'Guest' })]);
        await expect(sellerUnblockBuyer({ uid: 'sB' }, 'sA_61400000001')).rejects.toThrow(/not found/);
        await sellerUnblockBuyer({ uid: 'sA' }, 'sA_61400000001');
        await expect(assertBuyerNotBlocked({ mobile: '0400 000 001' }, ['sA'])).resolves.toBeUndefined();
    });

    it('older signed-in orders without a mobile are blocked by account', async () => {
        put('orders', 'o7', { sellerId: 'sA', buyerId: 'acct9', status: 'requested', stockMode: 'request' });
        const r = await sellerBlockBuyer({ uid: 'sA' }, 'o7');
        expect(r.id).toBe('sA_u-acct9');
        await expect(assertBuyerNotBlocked({ uid: 'acct9', mobile: '0411 111 111' }, ['sA'])).rejects.toThrow(SELLER_BLOCKED_MESSAGE);
    });

    it('buyer history: counts across the site for the seller\'s own requests only', async () => {
        const h = await buyerHistoryForOrders('sA', ['o1', 'o4']);
        expect(Object.keys(h)).toEqual(['o1']);
        expect(h.o1.label).toBe('1 completed · 3 open'); // o1 itself is left out
    });
});

describe('sitewide blocks', () => {
    it('admins only; blocks every seller and cancels open requests with seller alerts', async () => {
        put('orders', 'a1', { sellerId: 'sA', buyerPhone: '+61400000005', status: 'requested', stockMode: 'request', items: [{ title: 'X' }] });
        put('orders', 'a2', { sellerId: 'sB', buyerId: 'acct5', status: 'countered', stockMode: 'request' });
        put('orders', 'a3', { sellerId: 'sB', buyerPhone: '+61400000005', status: 'paid' });
        await expect(adminBlockMobile({ uid: 'sA', role: 'user' }, { mobile: '0400000005' })).rejects.toThrow(/Admins only/);
        await expect(adminBlockMobile(ADMIN, { mobile: '12345' })).rejects.toThrow(/Australian mobile/);
        const r = await adminBlockMobile(ADMIN, { mobile: '+61 400 000 005', uid: 'acct5', reason: 'scam' });
        expect(r).toEqual({ mobile: '+61400000005', cancelled: 2 });
        expect(get('orders', 'a1')).toMatchObject({ status: 'cancelled', cancelReason: 'blocked_sitewide' });
        expect(get('orders', 'a2')).toMatchObject({ status: 'cancelled', cancelReason: 'blocked_sitewide' });
        expect(get('orders', 'a3').status).toBe('paid');
        expect(notify.pushOrderToSeller).toHaveBeenCalledTimes(2);
        await expect(assertBuyerNotBlocked({ mobile: '0400 000 005' }, ['anyone'])).rejects.toThrow(SITEWIDE_BLOCKED_MESSAGE);
        await expect(assertBuyerNotBlocked({ uid: 'acct5' }, [])).rejects.toThrow(SITEWIDE_BLOCKED_MESSAGE);
        await adminUnblockMobile(ADMIN, '0400 000 005');
        await expect(assertBuyerNotBlocked({ mobile: '0400 000 005' }, ['anyone'])).resolves.toBeUndefined();
    });

    it('admin list shows numbers blocked by 2+ sellers until promoted', async () => {
        put('seller_blocks', 'sA_61400000007', { sellerId: 'sA', mobile: '+61400000007', reason: 'no-show', createdAtMs: 1 });
        put('seller_blocks', 'sB_61400000007', { sellerId: 'sB', mobile: '+61400000007', createdAtMs: 2 });
        put('seller_blocks', 'sB_61400000008', { sellerId: 'sB', mobile: '+61400000008' });
        let l = await adminListBlocks(ADMIN);
        expect(l.multiSeller).toEqual([expect.objectContaining({ mobile: '+61400000007', sellerCount: 2, display: '0400 000 007' })]);
        await adminBlockMobile(ADMIN, { mobile: '0400000007' });
        l = await adminListBlocks(ADMIN);
        expect(l.multiSeller).toEqual([]);
        expect(l.sitewide.map((s) => s.mobile)).toEqual(['0400 000 007']);
    });
});

describe('signed-in buyer mobile', () => {
    it('uses the profile mobile, otherwise requires one and saves it', async () => {
        put('users', 'u1', { phoneNumber: '0412 345 678' });
        expect(await resolveBuyerMobile('u1')).toBe('+61412345678');
        put('users', 'u2', { phoneNumber: '(08) 9123 4567' });
        await expect(resolveBuyerMobile('u2')).rejects.toMatchObject({ code: 'MOBILE_REQUIRED' });
        expect(await getBuyerMobileStatus('u2')).toEqual({ hasMobile: false, masked: null });
        expect(await resolveBuyerMobile('u2', '0499 888 777')).toBe('+61499888777');
        expect(get('users', 'u2').phoneNumber).toBe('+61499888777');
        expect(await getBuyerMobileStatus('u2')).toEqual({ hasMobile: true, masked: '0499 *** 777' });
    });
});
