'use server';

/**
 * Guest checkout server actions (no account, no email: a name and a mobile). Thin wrappers that add rate limits and
 * the caller's IP; the logic lives in src/lib/checkout/guest-server.ts.
 */
import { checkRateLimit, clientIp } from '@/lib/rate-limit-guard';
import { identityHash } from '@/lib/checkout/guest-crypto';
import { normalizeAuMobile } from '@/lib/checkout/guest-validation';
import {
    issueGuestCheckoutTicket,
    placeGuestRequest,
    cancelGuestOrderByToken,
    respondToCounterByToken,
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

/** Sends a Buy or Offer request to the seller (no email code, nothing held). */
export async function placeGuestRequestAction(input: {
    productId: string;
    ticketId: string;
    name: string;
    mobile: string;
    shippingMethod?: 'pickup' | 'shipping';
    shippingAddress?: { street?: string; city?: string; state?: string; zip?: string } | null;
    deviceId?: string;
    website?: string;
    requestType?: 'buy' | 'offer';
    offerAmount?: number | null;
}): Promise<Result<{ orderToken: string; orderId: string; paymentReference: string; totalAmount: number; requestType: 'buy' | 'offer'; title: string }>> {
    try {
        const ip = await clientIp();
        const mobile = normalizeAuMobile(input?.mobile);
        const device = validDevice(input?.deviceId);
        // Request attempts: per IP, device and mobile (on top of the 3-open-requests cap).
        const checks = [
            checkRateLimit('guest_hold_ip', { limit: 10, windowSeconds: 3600, identifier: identityHash('ip', ip) }),
            ...(device ? [checkRateLimit('guest_hold_device', { limit: 6, windowSeconds: 3600, identifier: identityHash('device', device) })] : []),
            ...(mobile ? [checkRateLimit('guest_hold_phone', { limit: 5, windowSeconds: 3600, identifier: identityHash('phone', mobile) })] : []),
        ];
        if ((await Promise.all(checks)).some((ok) => !ok)) {
            return { success: false, error: 'Too many requests in a short time. Please wait a while and try again, or sign in to buy.' };
        }
        const { email: _ignored, ...rest } = (input || {}) as any;
        const r = await placeGuestRequest(rest, { ip, deviceId: device });
        return { success: true, ...r };
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

/** Guest accepts or declines the seller's counter-offer (authorised by the order token). */
export async function respondToCounterAction(token: string, accept: boolean): Promise<Result<object>> {
    try {
        const ip = await clientIp();
        if (!(await checkRateLimit('guest_counter_ip', { limit: 20, windowSeconds: 3600, identifier: identityHash('ip', ip) }))) {
            return { success: false, error: 'Too many attempts. Please wait a while and try again.' };
        }
        await respondToCounterByToken(String(token || ''), !!accept);
        return { success: true };
    } catch (e) {
        return fail(e);
    }
}
