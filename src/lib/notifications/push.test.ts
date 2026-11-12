import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));
const { adminMessaging } = vi.hoisted(() => ({ adminMessaging: { sendEachForMulticast: vi.fn() } }));
vi.mock('@/lib/firebase/admin', () => ({ firestoreDb: {}, messagingAdmin: adminMessaging }));

import { buildBuyerRequestPush, buildOrderPush, buildWebPushMessage, isDeadTokenError, isPlausibleFcmToken, SELLER_ORDERS_PATH } from './push-payload';
import { sendPushToUser, pushOrderToSeller, fcmTokenDocId } from './push-server';
import { detectPushSupport, deviceLabel, iosVersion } from './push-env';

const order = {
    id: 'ord1', sellerId: 'seller1', isGuest: true, paymentMethod: 'payid', stockMode: 'hold',
    paymentReference: 'BEN-1234', totalAmount: 45, items: [{ title: '2003 Topps LeBron James Rookie', quantity: 1 }],
};

describe('push payloads', () => {
    it('new hold: title, price, 30 min and PayID, opens the seller orders page', () => {
        const p = buildOrderPush('new_order', order);
        expect(p.title).toBe('New guest order');
        expect(p.body).toBe('New order: 2003 Topps LeBron James Rookie, $45.00, held 30 min, awaiting PayID. Ref BEN-1234.');
        expect(p.url).toBe(SELLER_ORDERS_PATH);
        expect(p.tag).toBe('order-ord1');
    });
    it('signed-in cash and multi-item orders', () => {
        const p = buildOrderPush('new_order', { ...order, isGuest: false, paymentMethod: 'cash', stockMode: undefined, items: [{ title: 'A' }, { title: 'B' }, { title: 'C' }] });
        expect(p.title).toBe('New order');
        expect(p.body).toContain('A + 2 more');
        expect(p.body).toContain('cash on pickup');
    });
    it('buyer cancelled and hold expired', () => {
        expect(buildOrderPush('cancelled_by_buyer', order).title).toMatch(/cancelled by the buyer/i);
        const exp = buildOrderPush('hold_expired', order);
        expect(exp.title).toMatch(/hold expired/i);
        expect(exp.body).toContain('back on sale');
    });
    it('requests: new buy request, new offer, counter accepted, request cancelled', () => {
        const r = { ...order, stockMode: 'request', requestType: 'buy', buyerName: 'Sam' };
        expect(buildOrderPush('new_request', r)).toMatchObject({ title: 'New buy request: tap to accept or decline', url: SELLER_ORDERS_PATH, tag: 'order-ord1' });
        expect(buildOrderPush('new_request', r).body).toContain("still listed until you accept");
        const o = buildOrderPush('new_request', { ...r, requestType: 'offer', offerAmount: 30 });
        expect(o.title).toMatch(/New offer/);
        expect(o.body).toContain('offer of $30.00');
        expect(buildOrderPush('counter_accepted', { ...r, counterAmount: 40 }).body).toContain('$40.00');
        expect(buildOrderPush('cancelled_by_buyer', r).title).toBe('Request cancelled by the buyer');
    });
    it('buyer request pushes open their purchases', () => {
        expect(buildBuyerRequestPush('request_accepted', order)).toMatchObject({ title: 'Request accepted', url: '/profile/orders' });
        expect(buildBuyerRequestPush('request_countered', { ...order, counterAmount: 40 }).body).toContain('$40.00');
        expect(buildBuyerRequestPush('request_declined', order).title).toBe('Request declined');
        expect(buildBuyerRequestPush('request_relisted', order).title).toBe('Item relisted');
    });
    it('long titles are clipped and bodies stay short', () => {
        const p = buildOrderPush('new_order', { ...order, items: [{ title: 'X'.repeat(500) }] });
        expect(p.body.length).toBeLessThanOrEqual(200);
    });
    it('web push message is data-only with high urgency and a link', () => {
        const m = buildWebPushMessage(buildOrderPush('new_order', order), ['t1']);
        expect(m.tokens).toEqual(['t1']);
        expect((m as any).notification).toBeUndefined();
        expect(m.data.url).toBe(SELLER_ORDERS_PATH);
        expect(m.webpush.headers.Urgency).toBe('high');
        expect(Object.values(m.data).every((v) => typeof v === 'string')).toBe(true);
    });
    it('token checks', () => {
        expect(isPlausibleFcmToken('a'.repeat(50))).toBe(false);
        expect(isPlausibleFcmToken(`abc:${'A1_-'.repeat(40)}`)).toBe(true);
        expect(isPlausibleFcmToken(`abc ${'A'.repeat(200)}`)).toBe(false);
        expect(isDeadTokenError({ code: 'messaging/registration-token-not-registered' })).toBe(true);
        expect(isDeadTokenError({ code: 'messaging/invalid-argument' })).toBe(false);
        expect(isDeadTokenError(undefined)).toBe(false);
        expect(fcmTokenDocId('x')).toMatch(/^[a-f0-9]{64}$/);
    });
});

function fakeDb(tokens: string[]) {
    const deleted: string[] = [];
    const docs = tokens.map((t) => ({ data: () => ({ token: t }), ref: { id: t } }));
    const db = {
        collection: () => ({ doc: () => ({ collection: () => ({ get: async () => ({ docs }) }) }) }),
        batch: () => ({ delete: (ref: any) => deleted.push(ref.id), commit: async () => {} }),
    };
    return { db, deleted };
}

describe('sending', () => {
    beforeEach(() => adminMessaging.sendEachForMulticast.mockReset());

    it('sends to every device and deletes dead tokens only', async () => {
        const { db, deleted } = fakeDb(['good', 'gone', 'flaky']);
        const messaging = {
            sendEachForMulticast: vi.fn(async () => ({
                successCount: 1,
                responses: [
                    { success: true },
                    { success: false, error: { code: 'messaging/registration-token-not-registered' } },
                    { success: false, error: { code: 'messaging/internal-error' } },
                ],
            })),
        };
        const r = await sendPushToUser('seller1', buildOrderPush('new_order', order), { db, messaging });
        expect(messaging.sendEachForMulticast).toHaveBeenCalledTimes(1);
        expect((messaging.sendEachForMulticast.mock.calls[0] as any)[0].tokens).toEqual(['good', 'gone', 'flaky']);
        expect(r).toEqual({ sent: 1, removed: 1 });
        expect(deleted).toEqual(['gone']);
    });

    it('no devices: nothing sent', async () => {
        const { db } = fakeDb([]);
        const messaging = { sendEachForMulticast: vi.fn() };
        const r = await sendPushToUser('seller1', buildOrderPush('new_order', order), { db, messaging });
        expect(r.reason).toBe('no-tokens');
        expect(messaging.sendEachForMulticast).not.toHaveBeenCalled();
    });

    it('pushOrderToSeller never throws (orders must not fail on a push)', async () => {
        const { db } = fakeDb(['t']);
        const messaging = { sendEachForMulticast: vi.fn(async () => { throw new Error('FCM down'); }) };
        const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
        await expect(pushOrderToSeller('new_order', order, { db, messaging })).resolves.toBeNull();
        expect(await pushOrderToSeller('new_order', { ...order, sellerId: undefined }, { db, messaging })).toBeNull();
        spy.mockRestore();
    });

    it('uses the Admin SDK messaging by default', async () => {
        const { db } = fakeDb(['t']);
        adminMessaging.sendEachForMulticast.mockResolvedValue({ successCount: 1, responses: [{ success: true }] });
        const r = await sendPushToUser('seller1', buildOrderPush('hold_expired', order), { db });
        expect(adminMessaging.sendEachForMulticast).toHaveBeenCalledTimes(1);
        expect(r.sent).toBe(1);
    });
});

const CHROME_WIN = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36';
const IPHONE_17 = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1';
const IPHONE_15 = 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.7 Mobile/15E148 Safari/604.1';
const all = { hasNotification: true, hasServiceWorker: true, hasPushManager: true };

describe('device support', () => {
    it('desktop and Android browsers are supported', () => {
        expect(detectPushSupport({ userAgent: CHROME_WIN, standalone: false, ...all })).toBe('supported');
        expect(detectPushSupport({ userAgent: ANDROID, standalone: false, ...all })).toBe('supported');
        expect(detectPushSupport({ userAgent: CHROME_WIN, standalone: false, ...all, hasPushManager: false })).toBe('unsupported');
    });
    it('iPhone needs the Home Screen app on iOS 16.4+', () => {
        expect(detectPushSupport({ userAgent: IPHONE_17, standalone: false, hasNotification: false, hasServiceWorker: true, hasPushManager: false })).toBe('ios-needs-home-screen');
        expect(detectPushSupport({ userAgent: IPHONE_17, standalone: true, ...all })).toBe('supported');
        expect(detectPushSupport({ userAgent: IPHONE_15, standalone: true, ...all })).toBe('ios-too-old');
        expect(iosVersion(IPHONE_17)).toBeCloseTo(17.02);
    });
    it('labels devices', () => {
        expect(deviceLabel(CHROME_WIN)).toBe('Chrome on Windows');
        expect(deviceLabel(IPHONE_17)).toBe('Safari on iPhone/iPad');
        expect(deviceLabel(ANDROID)).toBe('Chrome on Android');
    });
});
