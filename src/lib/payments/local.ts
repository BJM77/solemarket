/**
 * Cash + PayID payments (no card processing, no bank API). Pure helpers, unit tested.
 *
 * Model: buyers pay the SELLER directly by PayID (or cash at a Perth pickup). The seller's
 * PayID lives in users/{uid}/private/payout (never public) and is only revealed to the buyer
 * of a placed order via a server action. The seller marks the order paid when funds arrive.
 */
export type LocalPaymentMethod = 'payid' | 'cash';

export const PAYID_HOLD_HOURS = 48;
export const CASH_HOLD_HOURS = 72;

export type PayIdType = 'email' | 'phone' | 'abn';

export interface SellerPayout {
    payId: string;
    payIdType: PayIdType;
    accountName: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Normalises + validates a PayID. Returns null if invalid. */
export function normalizePayId(raw: string): { payId: string; payIdType: PayIdType } | null {
    const v = String(raw || '').trim();
    if (!v) return null;
    if (EMAIL_RE.test(v) && v.length <= 254) return { payId: v.toLowerCase(), payIdType: 'email' };
    const digits = v.replace(/[\s\-()]/g, '');
    // AU mobile: 04xxxxxxxx or +614xxxxxxxx
    if (/^04\d{8}$/.test(digits)) return { payId: `+61${digits.slice(1)}`, payIdType: 'phone' };
    if (/^\+?614\d{8}$/.test(digits)) return { payId: `+${digits.replace(/^\+/, '')}`, payIdType: 'phone' };
    if (/^\d{11}$/.test(digits) && isValidAbn(digits)) return { payId: digits, payIdType: 'abn' };
    return null;
}

export function isValidAbn(abn: string): boolean {
    if (!/^\d{11}$/.test(abn)) return false;
    const w = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19];
    const d = abn.split('').map(Number);
    d[0] -= 1;
    return d.reduce((s, n, i) => s + n * w[i], 0) % 89 === 0;
}

export function validateSellerPayout(input: any): SellerPayout {
    const norm = normalizePayId(input?.payId);
    if (!norm) throw new Error('Enter a valid PayID: an email, an Australian mobile (04..) or an ABN.');
    const accountName = String(input?.accountName ?? '').trim().replace(/\s+/g, ' ');
    if (accountName.length < 2 || accountName.length > 140) throw new Error('Enter the account name exactly as your bank shows it.');
    return { ...norm, accountName };
}

/** Partially hides a PayID for display to the seller in lists (full value only for buyers of an order). */
export function maskPayId(p: string): string {
    if (!p) return '';
    if (p.includes('@')) {
        const [u, d] = p.split('@');
        return `${u.slice(0, 2)}***@${d}`;
    }
    return `${p.slice(0, 4)}***${p.slice(-3)}`;
}

const REF_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I

/** Unique-enough human reference, e.g. BEN-7KQ2XM. Caller checks for collisions. */
export function generatePaymentReference(rand: () => number = Math.random): string {
    let s = '';
    for (let i = 0; i < 6; i++) s += REF_ALPHABET[Math.floor(rand() * REF_ALPHABET.length)];
    return `BEN-${s}`;
}

export function paymentDueAt(method: LocalPaymentMethod, from: Date = new Date()): Date {
    const h = method === 'payid' ? PAYID_HOLD_HOURS : CASH_HOLD_HOURS;
    return new Date(from.getTime() + h * 3600_000);
}

/** Old UI values -> new method ids. */
export function normalizePaymentMethod(m: unknown): LocalPaymentMethod | null {
    const v = String(m ?? '').toLowerCase();
    if (v === 'payid' || v.includes('payid') || v.includes('eft')) return 'payid';
    if (v === 'cash' || v.includes('cash')) return 'cash';
    return null;
}

export interface CheckoutPaymentCheck {
    method: LocalPaymentMethod;
    shippingMethod: 'pickup' | 'shipping';
    sellers: { sellerId: string; sellerName?: string; payIdReady: boolean }[];
    perthPickupConfirmed?: boolean;
}

/** Throws a buyer-friendly error if this payment choice can't be used for this cart. */
export function assertCheckoutPaymentAllowed(c: CheckoutPaymentCheck): void {
    if (c.method === 'cash') {
        if (c.shippingMethod !== 'pickup') throw new Error('Cash is only available for local pickup in Perth. Choose pickup or pay by PayID.');
        if (!c.perthPickupConfirmed) throw new Error('Please confirm you can collect in person in Perth to pay cash.');
        return;
    }
    const missing = c.sellers.filter(s => !s.payIdReady);
    if (missing.length) {
        const names = missing.map(s => s.sellerName || 'A seller').join(', ');
        throw new Error(`${names} can't take PayID payments yet. Pay cash at a Perth pickup, or remove their items.`);
    }
}

/** Order statuses in the cash/PayID flow. */
export const OPEN_PAYMENT_STATUSES = ['awaiting_payment'] as const;

export type OrderPaymentAction = 'mark_paid' | 'mark_collected' | 'cancel';

/** Which transitions are allowed. Returns the patch to apply, or throws. */
export function nextOrderState(order: { status: string; paymentMethod?: string; shippingMethod?: string; paymentStatus?: string }, action: OrderPaymentAction) {
    const method = normalizePaymentMethod(order.paymentMethod);
    if (action === 'mark_paid') {
        if (order.status !== 'awaiting_payment') throw new Error('This order is not awaiting payment.');
        return { status: 'paid', paymentStatus: 'paid', productStatus: 'sold' as const };
    }
    if (action === 'mark_collected') {
        if (order.shippingMethod !== 'pickup' && method !== 'cash') throw new Error('Only pickup orders can be marked collected.');
        if (!['awaiting_payment', 'paid', 'processing'].includes(order.status)) throw new Error('This order cannot be marked collected.');
        return { status: 'completed', paymentStatus: 'paid', productStatus: 'sold' as const, collected: true };
    }
    if (order.status !== 'awaiting_payment') throw new Error('Only unpaid orders can be cancelled here.');
    return { status: 'cancelled', paymentStatus: 'cancelled', productStatus: 'available' as const };
}
