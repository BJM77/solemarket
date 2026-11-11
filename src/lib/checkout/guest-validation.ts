/** Guest checkout input validation. Safe to import on the client and the server. */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function normalizeEmail(raw: unknown): string | null {
    const v = String(raw ?? '').trim().toLowerCase();
    return v.length <= 254 && EMAIL_RE.test(v) ? v : null;
}

/** Australian mobile -> +614xxxxxxxx, or null. */
export function normalizeAuMobile(raw: unknown): string | null {
    const d = String(raw ?? '').replace(/[\s\-().]/g, '');
    if (/^04\d{8}$/.test(d)) return `+61${d.slice(1)}`;
    if (/^\+?614\d{8}$/.test(d)) return `+${d.replace(/^\+/, '')}`;
    if (/^00614\d{8}$/.test(d)) return `+${d.slice(2)}`;
    return null;
}

export function normalizeName(raw: unknown): string | null {
    const v = String(raw ?? '').replace(/[\u0000-\u001f<>]/g, '').trim().replace(/\s+/g, ' ');
    return v.length >= 2 && v.length <= 80 ? v : null;
}

export interface GuestShippingAddress { street: string; city: string; state: string; zip: string }

export interface GuestDetailsInput {
    name: unknown;
    email: unknown;
    mobile: unknown;
    shippingMethod?: unknown;
    shippingAddress?: Partial<Record<keyof GuestShippingAddress, unknown>> | null;
}

export interface GuestDetails {
    name: string;
    email: string;
    mobile: string;
    shippingMethod: 'pickup' | 'shipping';
    shippingAddress: GuestShippingAddress | null;
}

const clean = (v: unknown, max: number) => String(v ?? '').replace(/[\u0000-\u001f<>]/g, '').trim().replace(/\s+/g, ' ').slice(0, max);

/** Throws a buyer-friendly error for the first invalid field. */
export function validateGuestDetails(input: GuestDetailsInput): GuestDetails {
    const name = normalizeName(input?.name);
    if (!name) throw new Error('Enter your name (2 to 80 characters).');
    const email = normalizeEmail(input?.email);
    if (!email) throw new Error('Enter a valid email address.');
    const mobile = normalizeAuMobile(input?.mobile);
    if (!mobile) throw new Error('Enter an Australian mobile number, e.g. 0412 345 678.');
    const shippingMethod = input?.shippingMethod === 'shipping' ? 'shipping' : 'pickup';
    let shippingAddress: GuestShippingAddress | null = null;
    if (shippingMethod === 'shipping') {
        const a = input?.shippingAddress || {};
        shippingAddress = { street: clean(a.street, 120), city: clean(a.city, 60), state: clean(a.state, 20).toUpperCase(), zip: clean(a.zip, 4) };
        if (shippingAddress.street.length < 3 || shippingAddress.city.length < 2 || !shippingAddress.state) {
            throw new Error('Enter your full postal address.');
        }
        if (!/^\d{4}$/.test(shippingAddress.zip)) throw new Error('Enter a 4-digit postcode.');
    }
    return { name, email, mobile, shippingMethod, shippingAddress };
}

export function isSixDigitCode(v: unknown): v is string {
    return typeof v === 'string' && /^\d{6}$/.test(v);
}
