/**
 * Guest orders remembered on this device (localStorage), so a buyer who comes back sees
 * "Your active orders" without an account or email. Only the private order-page token and
 * display bits are kept; nothing is sent anywhere.
 */
export const GUEST_ORDERS_KEY = 'benched:guest-orders';
const KEEP_MS = 30 * 24 * 3600_000;
const MAX = 20;

export interface LocalGuestOrder {
    token: string;
    title: string;
    reference?: string;
    totalAmount?: number;
    createdAtMs: number;
    holdExpiresAtMs?: number | null;
    /** Last status seen on the order page. */
    status?: string;
    /** Last request status seen (pending, countered, accepted, ...). */
    requestStatus?: string | null;
}

function read(): LocalGuestOrder[] {
    try {
        const raw = JSON.parse(localStorage.getItem(GUEST_ORDERS_KEY) || '[]');
        return Array.isArray(raw) ? raw.filter((o) => o && typeof o.token === 'string' && /^[A-Za-z0-9_-]{40,64}$/.test(o.token)) : [];
    } catch {
        return [];
    }
}

function write(list: LocalGuestOrder[]) {
    try { localStorage.setItem(GUEST_ORDERS_KEY, JSON.stringify(list.slice(0, MAX))); } catch { /* private mode */ }
    try { window.dispatchEvent(new Event('benched-guest-orders')); } catch { /* ignore */ }
}

export function listGuestOrders(nowMs: number = Date.now()): LocalGuestOrder[] {
    return read().filter((o) => nowMs - Number(o.createdAtMs || 0) < KEEP_MS).sort((a, b) => b.createdAtMs - a.createdAtMs);
}

export function saveGuestOrder(o: LocalGuestOrder) {
    const list = read().filter((x) => x.token !== o.token);
    const prev = read().find((x) => x.token === o.token);
    write([{ ...prev, ...o, createdAtMs: prev?.createdAtMs || o.createdAtMs }, ...list]);
}

export function removeGuestOrder(token: string) {
    write(read().filter((x) => x.token !== token));
}

/**
 * Still needs the buyer's attention: a request waiting on the seller (pending, last seen under
 * 24h ago), a counter-offer to answer, or an accepted request / older hold awaiting payment.
 */
export function isLocalOrderActive(o: LocalGuestOrder, nowMs: number = Date.now()): boolean {
    if (o.status === 'requested') return nowMs - Number(o.createdAtMs || 0) < 24 * 3600_000;
    if (o.status === 'countered') return true;
    if (o.status !== 'awaiting_payment' && o.status) return false;
    if (o.requestStatus === 'accepted') return true;
    return !!o.holdExpiresAtMs && o.holdExpiresAtMs > nowMs;
}

/** Short label for the device's order list. */
export function localOrderLabel(o: LocalGuestOrder, nowMs: number = Date.now()): string {
    if (o.status === 'requested') return isLocalOrderActive(o, nowMs) ? 'Waiting for the seller' : 'Request expired';
    if (o.status === 'countered') return 'Counter-offer to answer';
    if (o.status === 'awaiting_payment') {
        if (o.requestStatus === 'accepted') return 'Accepted: pay the seller';
        return isLocalOrderActive(o, nowMs) ? 'On hold, awaiting your PayID payment' : 'Awaiting payment';
    }
    if (o.status === 'declined') return 'Declined';
    if (o.status === 'expired') return 'Expired';
    if (o.status === 'cancelled') return o.requestStatus === 'seller_relisted' ? 'Relisted by the seller' : 'Cancelled';
    if (o.status === 'paid' || o.status === 'completed') return 'Paid';
    return o.status ? o.status.replace(/_/g, ' ') : 'Order';
}
