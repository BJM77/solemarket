/**
 * Seller push notifications (FCM web push): pure payload builders, unit tested.
 * Safe to import anywhere; sending lives in ./push-server.ts (Admin SDK).
 */

export const SELLER_ORDERS_PATH = '/seller/dashboard?tab=orders';

export type OrderPushKind = 'new_order' | 'cancelled_by_buyer' | 'hold_expired' | 'new_request' | 'counter_accepted';

/** Status changes pushed to a signed-in buyer who turned notifications on. */
export type BuyerRequestPushKind = 'request_accepted' | 'request_declined' | 'request_countered' | 'request_relisted';

export const BUYER_ORDERS_PATH = '/profile/orders';

export interface OrderPushInput {
    id?: string;
    requestType?: string | null;
    offerAmount?: number | null;
    counterAmount?: number | null;
    items?: { title?: string; quantity?: number }[];
    totalAmount?: number;
    paymentMethod?: string;
    stockMode?: string;
    paymentReference?: string;
    payIdReference?: string;
    buyerName?: string | null;
    isGuest?: boolean;
}

export interface PushPayload {
    title: string;
    body: string;
    /** Relative path opened when the notification is tapped. */
    url: string;
    /** Same tag replaces an older notification for the same order. */
    tag: string;
}

const money = (n: unknown) => `$${(Math.round(Number(n || 0) * 100) / 100).toFixed(2)}`;

function clip(s: string, max: number): string {
    const v = String(s || '').replace(/\s+/g, ' ').trim();
    return v.length > max ? `${v.slice(0, max - 1).trimEnd()}…` : v;
}

function itemLabel(o: OrderPushInput): string {
    const items = Array.isArray(o.items) ? o.items : [];
    const first = clip(items[0]?.title || 'an item', 60);
    return items.length > 1 ? `${first} + ${items.length - 1} more` : first;
}

export function buildOrderPush(kind: OrderPushKind, o: OrderPushInput): PushPayload {
    const ref = o.paymentReference || o.payIdReference || '';
    const tag = `order-${o.id || ref || 'unknown'}`;
    const item = itemLabel(o);
    const amount = money(o.totalAmount);
    if (kind === 'new_order') {
        const isPayId = o.paymentMethod === 'payid';
        const hold = isPayId && o.stockMode === 'hold' ? ', held 30 min, awaiting PayID' : isPayId ? ', awaiting PayID' : ', cash on pickup';
        return {
            title: o.isGuest ? 'New guest order' : 'New order',
            body: clip(`New order: ${item}, ${amount}${hold}.${ref ? ` Ref ${ref}.` : ''}`, 200),
            url: SELLER_ORDERS_PATH,
            tag,
        };
    }
    if (kind === 'new_request') {
        const isOffer = o.requestType === 'offer';
        const what = isOffer ? `offer of ${money(o.offerAmount)}` : `request to buy at ${money(o.totalAmount)}`;
        return {
            title: isOffer ? 'New offer: tap to accept, decline or counter' : 'New buy request: tap to accept or decline',
            body: clip(`${o.buyerName || 'A buyer'} sent an ${what} for ${item}. It's still listed until you accept.`, 200),
            url: SELLER_ORDERS_PATH,
            tag,
        };
    }
    if (kind === 'counter_accepted') {
        return {
            title: 'Counter-offer accepted',
            body: clip(`${o.buyerName || 'The buyer'} accepted your counter of ${money(o.counterAmount)} for ${item}. It's now reserved for them.`, 200),
            url: SELLER_ORDERS_PATH,
            tag,
        };
    }
    if (kind === 'cancelled_by_buyer' && o.stockMode === 'request') {
        return {
            title: 'Request cancelled by the buyer',
            body: clip(`The buyer cancelled their request for ${item} (${amount}). It's on sale for everyone.${ref ? ` Ref ${ref}.` : ''}`, 200),
            url: SELLER_ORDERS_PATH,
            tag,
        };
    }
    if (kind === 'cancelled_by_buyer') {
        return {
            title: 'Order cancelled by the buyer',
            body: clip(`${item} (${amount}) is back on sale.${ref ? ` Ref ${ref}.` : ''}`, 200),
            url: SELLER_ORDERS_PATH,
            tag,
        };
    }
    return {
        title: 'Hold expired: no payment marked',
        body: clip(`${item} (${amount}) is back on sale. If the PayID money did arrive, you can still mark it paid while the item is free.${ref ? ` Ref ${ref}.` : ''}`, 200),
        url: SELLER_ORDERS_PATH,
        tag,
    };
}

export function buildBuyerRequestPush(kind: BuyerRequestPushKind, o: OrderPushInput): PushPayload {
    const item = itemLabel(o);
    const tag = `request-${o.id || 'unknown'}`;
    if (kind === 'request_accepted') {
        return { title: 'Request accepted', body: clip(`The seller accepted your request for ${item}. Open it to see how to pay or collect.`, 200), url: BUYER_ORDERS_PATH, tag };
    }
    if (kind === 'request_countered') {
        return { title: 'Counter-offer received', body: clip(`The seller countered with ${money(o.counterAmount)} for ${item}. Accept or decline within 24 hours.`, 200), url: BUYER_ORDERS_PATH, tag };
    }
    if (kind === 'request_relisted') {
        return { title: 'Item relisted', body: clip(`The seller relisted ${item}, so your reservation has ended.`, 200), url: BUYER_ORDERS_PATH, tag };
    }
    return { title: 'Request declined', body: clip(`The seller declined your request for ${item}.`, 200), url: BUYER_ORDERS_PATH, tag };
}

/**
 * FCM message for web push. Data-only on purpose: our own service worker
 * (public/firebase-messaging-sw.js) always shows exactly one notification, which iOS requires,
 * and there's no duplicate from FCM's auto-display.
 */
export function buildWebPushMessage(p: PushPayload, tokens: string[]) {
    return {
        tokens,
        data: { title: p.title, body: p.body, url: p.url, tag: p.tag },
        webpush: {
            headers: { Urgency: 'high', TTL: String(30 * 60) },
            fcmOptions: { link: p.url },
        },
    };
}

/**
 * FCM error codes that mean the token is gone for good and should be deleted.
 * Not 'invalid-argument': that can be a payload problem and would wipe every device.
 */
const DEAD_TOKEN_CODES = new Set([
    'messaging/registration-token-not-registered',
    'messaging/invalid-registration-token',
]);

export function isDeadTokenError(err: { code?: string } | undefined | null): boolean {
    return !!err?.code && DEAD_TOKEN_CODES.has(err.code);
}

/** Plausible FCM registration token (they're long base64url-ish strings with a ':'). */
export function isPlausibleFcmToken(t: unknown): t is string {
    return typeof t === 'string' && t.length >= 100 && t.length <= 4096 && /^[\w:-]+$/.test(t);
}
