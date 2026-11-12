'use server';

/**
 * Seller-approved purchase requests (signed-in buyers and sellers). Every write goes through
 * the Admin SDK in a transaction (src/lib/checkout/requests-server.ts); these wrappers only
 * authenticate and check who may act. Guests use ./guest-checkout.ts (order-token auth).
 */
import { firestoreDb } from '@/lib/firebase/admin';
import { ensureActionAuth } from '@/lib/action-utils';
import { checkRateLimit } from '@/lib/rate-limit-guard';
import {
    buyerRespondToRequest, countListingRequests, createSignedInRequest, relistAcceptedRequest, sellerRespondToRequest,
    type SignedInRequestInput,
} from '@/lib/checkout/requests-server';

type Result<T = object> = ({ success: true } & T) | { success: false; error: string; needsMobile?: boolean };
const fail = (e: any): { success: false; error: string; needsMobile?: boolean } => ({
    success: false,
    error: e?.message || 'Something went wrong. Please try again.',
    ...(e?.code === 'MOBILE_REQUIRED' ? { needsMobile: true } : {}),
});

/** Signed-in buyer: send a Buy or Offer request on one listing. */
export async function sendRequestAction(idToken: string, input: SignedInRequestInput): Promise<Result<{ order: any }>> {
    try {
        const auth = await ensureActionAuth(idToken);
        if (!(await checkRateLimit('request_uid', { limit: 15, windowSeconds: 3600, identifier: auth.uid }))) {
            return { success: false, error: 'Too many requests in a short time. Please wait a while and try again.' };
        }
        const order = await createSignedInRequest({ uid: auth.uid, email: auth.email, name: (auth as any).name }, input);
        return { success: true, order };
    } catch (e) {
        return fail(e);
    }
}

/** Seller (or admin): accept, decline, or counter an offer. */
export async function respondToRequestAction(idToken: string, orderId: string, action: 'accept' | 'decline' | 'counter', counterAmount?: number): Promise<Result<{ status: string }>> {
    try {
        if (!['accept', 'decline', 'counter'].includes(action)) throw new Error('Unknown action.');
        const { uid, role } = await ensureActionAuth(idToken);
        const patch: any = await sellerRespondToRequest(String(orderId), { uid, role }, action, counterAmount);
        return { success: true, status: patch.status };
    } catch (e) {
        return fail(e);
    }
}

/** Seller (or admin): relist an accepted request (buyer took too long). */
export async function relistRequestAction(idToken: string, orderId: string): Promise<Result<{ status: string }>> {
    try {
        const { uid, role } = await ensureActionAuth(idToken);
        const patch: any = await relistAcceptedRequest(String(orderId), { uid, role });
        return { success: true, status: patch.status };
    } catch (e) {
        return fail(e);
    }
}

/** Signed-in buyer: accept / decline a counter-offer, or cancel their request. */
export async function buyerRequestAction(idToken: string, orderId: string, action: 'accept_counter' | 'decline_counter' | 'buyer_cancel'): Promise<Result<{ status: string }>> {
    try {
        if (!['accept_counter', 'decline_counter', 'buyer_cancel'].includes(action)) throw new Error('Unknown action.');
        const { uid } = await ensureActionAuth(idToken);
        const snap = await firestoreDb.collection('orders').doc(String(orderId)).get();
        if (!snap.exists || snap.data()?.buyerId !== uid) throw new Error('Request not found.');
        const patch: any = await buyerRespondToRequest(String(orderId), action);
        return { success: true, status: patch.status };
    } catch (e) {
        return fail(e);
    }
}

/** Public: number of open requests on a listing (no buyer details). */
export async function getListingRequestCountAction(productId: string): Promise<number> {
    try {
        return await countListingRequests(String(productId || ''));
    } catch {
        return 0;
    }
}
