'use server';

/**
 * Guest checkout server actions (no account, no email). Thin wrappers that add rate limits and
 * the caller's IP; the logic lives in src/lib/checkout/guest-server.ts.
 */
import { checkRateLimit, clientIp } from '@/lib/rate-limit-guard';
import { identityHash } from '@/lib/checkout/guest-crypto';
import { normalizeAuMobile, normalizeEmail } from '@/lib/checkout/guest-validation';
import {
    issueGuestCheckoutTicket,
    placeGuestHold,
    cancelGuestOrderByToken,
} from '@/lib/checkout/guest-server';

type Result<T> = ({ success: true } & T) | { success: false; error: string };

const fail = (e: any): { success: false; error: string } => ({ success: false, error: e?.message || 'Something went wrong. Please try again.' });
const validDevice = (d: unknown) => (typeof d === 'string' && /^[\w-]{8,64}$/.test(d) ? d : null);

/** Called when the guest checkout form opens. */
export async function startGuestCheckoutAction(productId: string): Promise<Result<{ ticketId: string; issuedAtMs: number; minFormMs: number }>> {
    try {
        const ip = await clientIp();
        if (!(await checkRateLimit('guest_ticket_ip', { limit: 40, windowSeconds: 3600, identifier: identityHash('ip', ip) }))) {
            return { success: false, error: 'Too many checkout attempts. Please wait a while and try again.' };
        }
        const r = await issueGuestCheckoutTicket(String(productId || ''), { ip });
        return { success: true, ...r };
    } catch (e) {
        return fail(e);
    }
}

/** Places the 30-minute hold directly (no email code). */
export async function placeGuestHoldAction(input: {
    productId: string;
    ticketId: string;
    name: string;
    email: string;
    mobile: string;
    shippingMethod?: 'pickup' | 'shipping';
    shippingAddress?: { street?: string; city?: string; state?: string; zip?: string } | null;
    deviceId?: string;
    website?: string;
}): Promise<Result<{ orderToken: string; orderId: string; paymentReference: string; totalAmount: number; holdExpiresAtMs: number | null; title: string }>> {
    try {
        const ip = await clientIp();
        const email = normalizeEmail(input?.email);
        const mobile = normalizeAuMobile(input?.mobile);
        const device = validDevice(input?.deviceId);
        // Hold attempts: per IP, device, email and mobile (on top of the 3-active-holds cap).
        const checks = [
            checkRateLimit('guest_hold_ip', { limit: 10, windowSeconds: 3600, identifier: identityHash('ip', ip) }),
            ...(device ? [checkRateLimit('guest_hold_device', { limit: 6, windowSeconds: 3600, identifier: identityHash('device', device) })] : []),
            ...(email ? [checkRateLimit('guest_hold_email', { limit: 5, windowSeconds: 3600, identifier: identityHash('email', email) })] : []),
            ...(mobile ? [checkRateLimit('guest_hold_phone', { limit: 5, windowSeconds: 3600, identifier: identityHash('phone', mobile) })] : []),
        ];
        if ((await Promise.all(checks)).some((ok) => !ok)) {
            return { success: false, error: 'Too many orders in a short time. Please wait a while and try again, or sign in to buy.' };
        }
        const r = await placeGuestHold(input as any, { ip, deviceId: device });
        return { success: true, ...r, holdExpiresAtMs: r.holdExpiresAtMs ?? null };
    } catch (e) {
        return fail(e);
    }
}

export async function cancelGuestOrderAction(token: string): Promise<Result<object>> {
    try {
        const ip = await clientIp();
        if (!(await checkRateLimit('guest_cancel_ip', { limit: 20, windowSeconds: 3600, identifier: identityHash('ip', ip) }))) {
            return { success: false, error: 'Too many attempts. Please wait a while and try again.' };
        }
        await cancelGuestOrderByToken(String(token || ''));
        return { success: true };
    } catch (e) {
        return fail(e);
    }
}
