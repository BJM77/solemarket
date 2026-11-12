'use server';

/** Admin: sitewide blocked mobiles (Admin SDK via src/lib/checkout/blocks-server.ts). */
import { ensureActionAuth } from '@/lib/action-utils';
import { adminBlockMobile, adminListBlocks, adminUnblockMobile } from '@/lib/checkout/blocks-server';

type Result<T = object> = ({ success: true } & T) | { success: false; error: string };
const fail = (e: any): { success: false; error: string } => ({ success: false, error: e?.message || 'Something went wrong. Please try again.' });

async function admin(idToken: string) {
    const { uid, role } = await ensureActionAuth(idToken);
    if (role !== 'admin' && role !== 'superadmin') throw new Error('Admins only.');
    return { uid, role };
}

export async function listBlockedMobilesAction(idToken: string): Promise<Result<Awaited<ReturnType<typeof adminListBlocks>>>> {
    try {
        const actor = await admin(idToken);
        return { success: true, ...(await adminListBlocks(actor)) };
    } catch (e) {
        return fail(e);
    }
}

export async function blockMobileAction(idToken: string, input: { mobile: string; uid?: string; reason?: string }): Promise<Result<{ cancelled: number }>> {
    try {
        const actor = await admin(idToken);
        const r = await adminBlockMobile(actor, input);
        return { success: true, cancelled: r.cancelled };
    } catch (e) {
        return fail(e);
    }
}

export async function unblockMobileAction(idToken: string, mobileOrKey: string): Promise<Result> {
    try {
        const actor = await admin(idToken);
        await adminUnblockMobile(actor, String(mobileOrKey || ''));
        return { success: true };
    } catch (e) {
        return fail(e);
    }
}
