'use server';

/**
 * Seller-level buyer blocks and the buyer's own mobile status. Thin wrappers: authenticate,
 * then call src/lib/checkout/blocks-server.ts (Admin SDK). Clients never read the block lists.
 */
import { ensureActionAuth } from '@/lib/action-utils';
import { checkRateLimit } from '@/lib/rate-limit-guard';
import {
    buyerHistoryForOrders, getBuyerMobileStatus, listSellerBlocks, sellerBlockBuyer, sellerUnblockBuyer,
} from '@/lib/checkout/blocks-server';

type Result<T = object> = ({ success: true } & T) | { success: false; error: string };
const fail = (e: any): { success: false; error: string } => ({ success: false, error: e?.message || 'Something went wrong. Please try again.' });

/** Signed-in buyer: does my profile have an Australian mobile? (masked) */
export async function getMyBuyerMobileAction(idToken: string): Promise<Result<{ hasMobile: boolean; masked: string | null }>> {
    try {
        const { uid } = await ensureActionAuth(idToken);
        return { success: true, ...(await getBuyerMobileStatus(uid)) };
    } catch (e) {
        return fail(e);
    }
}

/** Seller: block the buyer on this request/order (declines their open requests to you). */
export async function blockBuyerAction(idToken: string, orderId: string, reason?: string): Promise<Result<{ declined: number }>> {
    try {
        const { uid, role } = await ensureActionAuth(idToken);
        if (!(await checkRateLimit('seller_block', { limit: 30, windowSeconds: 3600, identifier: uid }))) {
            return { success: false, error: 'Too many changes in a short time. Please wait a while and try again.' };
        }
        const r = await sellerBlockBuyer({ uid, role }, String(orderId || ''), reason);
        return { success: true, declined: r.declined };
    } catch (e) {
        return fail(e);
    }
}

export async function unblockBuyerAction(idToken: string, blockId: string): Promise<Result> {
    try {
        const { uid, role } = await ensureActionAuth(idToken);
        await sellerUnblockBuyer({ uid, role }, String(blockId || ''));
        return { success: true };
    } catch (e) {
        return fail(e);
    }
}

export async function listMyBlockedBuyersAction(idToken: string): Promise<Result<{ blocks: Awaited<ReturnType<typeof listSellerBlocks>> }>> {
    try {
        const { uid } = await ensureActionAuth(idToken);
        return { success: true, blocks: await listSellerBlocks(uid) };
    } catch (e) {
        return fail(e);
    }
}

/** Seller: past outcomes (counts only) for the buyers on these requests. */
export async function getBuyerHistoryAction(idToken: string, orderIds: string[]): Promise<Result<{ history: Record<string, { label: string }> }>> {
    try {
        const { uid } = await ensureActionAuth(idToken);
        const r = await buyerHistoryForOrders(uid, Array.isArray(orderIds) ? orderIds : []);
        const history: Record<string, { label: string }> = {};
        for (const [id, v] of Object.entries(r)) history[id] = { label: v.label };
        return { success: true, history };
    } catch (e) {
        return fail(e);
    }
}
