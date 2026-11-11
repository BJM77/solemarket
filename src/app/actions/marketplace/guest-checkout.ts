'use server';

/**
 * Guest checkout server actions (no account needed). Thin wrappers that add rate limits and
 * the caller's IP; the logic lives in src/lib/checkout/guest-server.ts.
 */
import { checkRateLimit, clientIp } from '@/lib/rate-limit-guard';
import { identityHash } from '@/lib/checkout/guest-crypto';
import { normalizeEmail } from '@/lib/checkout/guest-validation';
import {
    requestGuestCheckoutCode,
    confirmGuestCheckout,
    cancelGuestOrderByToken,
} from '@/lib/checkout/guest-server';
import { isEmailConfigured, sendGuestCheckoutCodeEmail } from '@/lib/email';

type Result<T> = ({ success: true } & T) | { success: false; error: string };

const fail = (e: any): { success: false; error: string } => ({ success: false, error: e?.message || 'Something went wrong. Please try again.' });

export async function requestGuestCodeAction(input: {
    productId: string;
    name: string;
    email: string;
    mobile: string;
    shippingMethod?: 'pickup' | 'shipping';
    shippingAddress?: { street?: string; city?: string; state?: string; zip?: string } | null;
    deviceId?: string;
}): Promise<Result<{ challengeId: string; email: string; totalAmount: number; shippingCost: number; holdMinutes: number }>> {
    try {
        const ip = await clientIp();
        const email = normalizeEmail(input?.email);
        // Code requests: per IP, per device and per email address.
        const checks = [
            checkRateLimit('guest_code_ip', { limit: 10, windowSeconds: 3600, identifier: identityHash('ip', ip) }),
            ...(input?.deviceId ? [checkRateLimit('guest_code_device', { limit: 8, windowSeconds: 3600, identifier: identityHash('device', String(input.deviceId).slice(0, 64)) })] : []),
            ...(email ? [checkRateLimit('guest_code_email', { limit: 5, windowSeconds: 3600, identifier: identityHash('email', email) })] : []),
        ];
        if ((await Promise.all(checks)).some((ok) => !ok)) {
            return { success: false, error: 'Too many code requests. Please wait a while and try again.' };
        }
        const r = await requestGuestCheckoutCode(input, { ip, deviceId: input?.deviceId }, {
            sendCode: sendGuestCheckoutCodeEmail,
            emailConfigured: isEmailConfigured,
        });
        return { success: true, ...r };
    } catch (e) {
        return fail(e);
    }
}

export async function confirmGuestCodeAction(input: { challengeId: string; code: string; deviceId?: string }): Promise<Result<{ orderToken: string }>> {
    try {
        const ip = await clientIp();
        if (!(await checkRateLimit('guest_confirm_ip', { limit: 30, windowSeconds: 3600, identifier: identityHash('ip', ip) }))) {
            return { success: false, error: 'Too many attempts. Please wait a while and try again.' };
        }
        const r = await confirmGuestCheckout({ challengeId: input?.challengeId, code: input?.code }, { ip, deviceId: input?.deviceId });
        return { success: true, orderToken: r.orderToken };
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
