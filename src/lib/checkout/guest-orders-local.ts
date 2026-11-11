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

/** Waiting for payment and the 30-minute hold hasn't run out. */
export function isLocalOrderActive(o: LocalGuestOrder, nowMs: number = Date.now()): boolean {
    if (o.status && o.status !== 'awaiting_payment') return false;
    return !!o.holdExpiresAtMs && o.holdExpiresAtMs > nowMs;
}
