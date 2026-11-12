/**
 * Blocked buyers: server side (Admin SDK only; Firestore rules deny all client access to
 * blocked_mobiles and seller_blocks). Pure rules live in ./blocks.ts.
 *
 *  - blocked_mobiles/{61412345678}         sitewide (admins): { mobile, uids[], reason, ... }
 *  - seller_blocks/{sellerId}_{61412345678} seller level:      { sellerId, mobile, uids[], reason, buyerName, ... }
 *    (or {sellerId}_u-{uid} for an older signed-in order without a mobile)
 *
 * Every request entry point (guest request, signed-in request/offer, cart checkout, accepting a
 * counter, bids) calls readBlocks + assertNotBlocked before writing anything.
 */
import { firestoreDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { sendNotification } from '@/services/notifications';
import { pushOrderToSeller, pushRequestToBuyer } from '@/lib/notifications/push-server';
import { SELLER_ORDERS_PATH } from '@/lib/notifications/push-payload';
import { normalizeAuMobile } from './guest-validation';
import {
    MobileRequiredError, assertNotBlocked, cleanReason, formatAuMobile, maskMobile, mergeUids, mobileKey,
    multiSellerBlocks, sellerBlockId, summariseBuyerHistory, formatBuyerHistory,
    type BlockEntry, type BuyerIdentity, type BuyerHistory,
} from './blocks';

const SITEWIDE = () => firestoreDb.collection('blocked_mobiles');
const SELLER_BLOCKS = () => firestoreDb.collection('seller_blocks');
const ORDERS = () => firestoreDb.collection('orders');
const OPEN = ['requested', 'countered', 'awaiting_payment'];
const UID_RE = /^[\w-]{1,128}$/;

export interface BlockActor { uid: string; role?: string }
const isAdmin = (a?: BlockActor | null) => !!a && (a.role === 'admin' || a.role === 'superadmin');
const toMs = (v: any): number | null => (v?.toMillis ? v.toMillis() : typeof v === 'number' ? v : null);

function toEntry(d: any): BlockEntry {
    const x = d.data() || {};
    return {
        id: d.id,
        mobile: x.mobile || null,
        uids: Array.isArray(x.uids) ? x.uids : [],
        sellerId: x.sellerId || null,
        reason: x.reason || null,
        buyerName: x.buyerName || null,
        createdAtMs: x.createdAtMs ?? toMs(x.createdAt),
    };
}

/**
 * Block entries that could apply to this buyer and these sellers. Pass a transaction to read
 * inside it (call before any transaction write). Single-field queries only: no composite index.
 */
export async function readBlocks(who: BuyerIdentity, sellerIds: string[], t?: any): Promise<{ sitewide: BlockEntry[]; seller: BlockEntry[] }> {
    const get = (x: any) => (t ? t.get(x) : x.get());
    const key = mobileKey(who.mobile);
    const uid = who.uid && UID_RE.test(who.uid) ? who.uid : null;
    const sellers = Array.from(new Set(sellerIds.filter((s) => s && UID_RE.test(s))));
    const sitewide: BlockEntry[] = [];
    const seller: BlockEntry[] = [];
    if (key) {
        const d = await get(SITEWIDE().doc(key));
        if (d.exists) sitewide.push(toEntry(d));
    }
    if (uid) {
        const s = await get(SITEWIDE().where('uids', 'array-contains', uid).limit(5));
        s.docs.forEach((d: any) => sitewide.push(toEntry(d)));
    }
    for (const sellerId of sellers) {
        for (const id of [sellerBlockId(sellerId, { mobile: who.mobile }), uid ? sellerBlockId(sellerId, { uid }) : null]) {
            if (!id) continue;
            const d = await get(SELLER_BLOCKS().doc(id));
            if (d.exists) seller.push(toEntry(d));
        }
    }
    if (uid && sellers.length) {
        const s = await get(SELLER_BLOCKS().where('uids', 'array-contains', uid).limit(100));
        s.docs.forEach((d: any) => { const e = toEntry(d); if (e.sellerId && sellers.includes(e.sellerId)) seller.push(e); });
    }
    return { sitewide, seller };
}

/** Throws BuyerBlockedError (neutral wording) when either block list covers this buyer. */
export async function assertBuyerNotBlocked(who: BuyerIdentity, sellerIds: string[], t?: any) {
    assertNotBlocked(await readBlocks(who, sellerIds, t), who, sellerIds);
}

/**
 * Signed-in buyer's mobile: the one on their profile, or (if missing) the one they just gave,
 * which is saved to their profile so blocks apply to everyone. Throws MobileRequiredError.
 */
export async function resolveBuyerMobile(uid: string, provided?: unknown): Promise<string> {
    const ref = firestoreDb.collection('users').doc(uid);
    const snap = await ref.get();
    const existing = normalizeAuMobile(snap.exists ? snap.data()?.phoneNumber : null);
    if (existing) return existing;
    const given = normalizeAuMobile(provided);
    if (!given) throw new MobileRequiredError();
    await ref.set({ phoneNumber: given, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    return given;
}

/** For the buyer's own forms: whether their profile has a usable mobile (masked, never full). */
export async function getBuyerMobileStatus(uid: string) {
    const snap = await firestoreDb.collection('users').doc(uid).get();
    const m = normalizeAuMobile(snap.exists ? snap.data()?.phoneNumber : null);
    return { hasMobile: !!m, masked: maskMobile(m) };
}

/** Account uids seen on orders with this mobile (so a block also covers those accounts). */
async function uidsForMobile(mobile: string | null): Promise<string[]> {
    if (!mobile) return [];
    const snap = await ORDERS().where('buyerPhone', '==', mobile).limit(100).get();
    return mergeUids(snap.docs.map((d: any) => d.data()?.buyerId));
}

/** Open orders for a buyer (by mobile and/or uids), optionally for one seller only. */
async function openOrdersFor(who: { mobile: string | null; uids: string[] }, sellerId?: string) {
    const found = new Map<string, any>();
    const run = async (field: string, value: string) => {
        let q: any = ORDERS().where(field, '==', value);
        if (sellerId) q = q.where('sellerId', '==', sellerId);
        const snap = await q.limit(200).get();
        snap.docs.forEach((d: any) => { if (OPEN.includes(d.data()?.status)) found.set(d.id, d); });
    };
    if (who.mobile) await run('buyerPhone', who.mobile);
    for (const uid of who.uids) await run('buyerId', uid);
    return Array.from(found.values());
}

/**
 * Ends a blocked buyer's open requests. Pending/countered requests are declined (seller block)
 * or cancelled (sitewide); accepted ones are cancelled through the order lifecycle so the item
 * goes back on sale.
 */
async function endOpenRequests(docs: any[], mode: 'seller_blocked' | 'blocked_sitewide', actor: BlockActor | null) {
    let ended = 0;
    for (const d of docs) {
        const o = { ...d.data(), id: d.id };
        const item = o.items?.[0]?.title || 'the item';
        try {
            if (o.status === 'awaiting_payment') {
                const { applyOrderTransition } = await import('@/lib/payments/server');
                await applyOrderTransition(d.id, 'cancel', mode === 'seller_blocked' ? actor : null, mode);
            } else {
                const changed = await firestoreDb.runTransaction(async (t: any) => {
                    const cur = await t.get(d.ref);
                    if (!cur.exists || !['requested', 'countered'].includes(cur.data()?.status)) return false;
                    t.update(d.ref, mode === 'seller_blocked'
                        ? { status: 'declined', requestStatus: 'declined', declineReason: 'seller_blocked', respondedAt: FieldValue.serverTimestamp(), statusUpdatedBy: actor?.uid || 'system', updatedAt: FieldValue.serverTimestamp() }
                        : { status: 'cancelled', requestStatus: 'cancelled', cancelReason: 'blocked_sitewide', cancelledAt: FieldValue.serverTimestamp(), statusUpdatedBy: actor?.uid || 'system', updatedAt: FieldValue.serverTimestamp() });
                    return true;
                });
                if (!changed) continue;
            }
            ended++;
            // Neutral wording for the buyer; sellers get an alert when support cancels a request.
            // (accepted orders already notified the buyer via applyOrderTransition).
            if (o.buyerId && o.status !== 'awaiting_payment') {
                await sendNotification(o.buyerId, 'system', 'Request declined', `Your request for ${item} was declined.`, '/profile/orders').catch(() => {});
                await pushRequestToBuyer('request_declined', o).catch(() => {});
            }
            if (mode === 'blocked_sitewide') {
                if (o.status !== 'awaiting_payment') {
                    await sendNotification(o.sellerId, 'system', 'Request cancelled', `A request for ${item} was cancelled by Benched support. It's still on sale for everyone.`, SELLER_ORDERS_PATH).catch(() => {});
                }
                await pushOrderToSeller('cancelled_by_support', o).catch(() => {});
            }
        } catch (e) {
            console.error('end blocked request failed', d.id, e);
        }
    }
    return ended;
}

// ---------------------------------------------------------------- seller level

/** Seller blocks the buyer on one of their requests/orders, and declines that buyer's open requests to them. */
export async function sellerBlockBuyer(actor: BlockActor, orderId: string, reason?: unknown) {
    if (!/^[\w-]{1,128}$/.test(String(orderId || ''))) throw new Error('Order not found.');
    const snap = await ORDERS().doc(String(orderId)).get();
    if (!snap.exists) throw new Error('Order not found.');
    const o = snap.data() as any;
    if (o.sellerId !== actor.uid && !isAdmin(actor)) throw new Error('Only the seller can block this buyer.');
    const sellerId = String(o.sellerId);
    const mobile = normalizeAuMobile(o.buyerPhone);
    const uid = o.buyerId && UID_RE.test(o.buyerId) ? String(o.buyerId) : null;
    if (!mobile && !uid) throw new Error("This order has no mobile or account for the buyer, so they can't be blocked.");
    if (uid === sellerId) throw new Error("You can't block yourself.");
    const id = sellerBlockId(sellerId, { mobile, uid })!;
    const uids = mergeUids(uid, await uidsForMobile(mobile));
    const ref = SELLER_BLOCKS().doc(id);
    const prev = await ref.get();
    await ref.set({
        sellerId,
        mobile: mobile || null,
        uids: mergeUids(prev.exists ? prev.data()?.uids : [], uids),
        reason: cleanReason(reason),
        buyerName: String(o.buyerName || '').slice(0, 80) || null,
        fromOrderId: snap.id,
        createdBy: actor.uid,
        createdAt: prev.exists ? prev.data()?.createdAt ?? FieldValue.serverTimestamp() : FieldValue.serverTimestamp(),
        createdAtMs: prev.exists ? prev.data()?.createdAtMs ?? Date.now() : Date.now(),
        updatedAt: FieldValue.serverTimestamp(),
    });
    const open = await openOrdersFor({ mobile, uids }, sellerId);
    const declined = await endOpenRequests(open, 'seller_blocked', actor);
    return { id, declined };
}

export async function sellerUnblockBuyer(actor: BlockActor, blockId: string) {
    if (!/^[\w-]{1,300}$/.test(String(blockId || ''))) throw new Error('Block not found.');
    const ref = SELLER_BLOCKS().doc(String(blockId));
    const snap = await ref.get();
    if (!snap.exists) return { removed: false };
    if (snap.data()?.sellerId !== actor.uid && !isAdmin(actor)) throw new Error('Block not found.');
    await ref.delete();
    return { removed: true };
}

export async function listSellerBlocks(sellerId: string) {
    const snap = await SELLER_BLOCKS().where('sellerId', '==', sellerId).limit(300).get();
    return snap.docs.map(toEntry)
        .sort((a: BlockEntry, b: BlockEntry) => (b.createdAtMs || 0) - (a.createdAtMs || 0))
        .map((e: BlockEntry) => ({
            id: e.id!,
            mobile: e.mobile ? formatAuMobile(e.mobile) : null,
            hasAccount: !!e.uids?.length,
            buyerName: e.buyerName || null,
            reason: e.reason || null,
            createdAtMs: e.createdAtMs || null,
        }));
}

/**
 * Past request outcomes for the buyers on these orders (counts only, across all sellers; no
 * other sellers' details). Only for orders that belong to `sellerId`.
 */
export async function buyerHistoryForOrders(sellerId: string, orderIds: string[]) {
    const ids = Array.from(new Set(orderIds.map(String).filter((id) => /^[\w-]{1,128}$/.test(id)))).slice(0, 60);
    if (!ids.length) return {} as Record<string, { history: BuyerHistory; label: string }>;
    const docs = await firestoreDb.getAll(...ids.map((id) => ORDERS().doc(id)));
    const out: Record<string, { history: BuyerHistory; label: string }> = {};
    const cache = new Map<string, any[]>();
    for (const d of docs) {
        if (!d.exists) continue;
        const o = d.data() as any;
        if (o.sellerId !== sellerId) continue;
        const mobile = normalizeAuMobile(o.buyerPhone);
        const key = mobile ? `m:${mobile}` : o.buyerId ? `u:${o.buyerId}` : null;
        if (!key) continue;
        if (!cache.has(key)) {
            const snap = await ORDERS().where(mobile ? 'buyerPhone' : 'buyerId', '==', mobile || o.buyerId).limit(200).get();
            cache.set(key, snap.docs.map((x: any) => ({ id: x.id, status: x.data()?.status, cancelReason: x.data()?.cancelReason || null, requestStatus: x.data()?.requestStatus || null })));
        }
        const history = summariseBuyerHistory(cache.get(key)!, d.id);
        out[d.id] = { history, label: formatBuyerHistory(history) };
    }
    return out;
}

// ---------------------------------------------------------------- sitewide (admin)

export async function adminBlockMobile(actor: BlockActor, input: { mobile: unknown; uid?: unknown; reason?: unknown }) {
    if (!isAdmin(actor)) throw new Error('Admins only.');
    const mobile = normalizeAuMobile(input?.mobile);
    if (!mobile) throw new Error('Enter an Australian mobile number, e.g. 0412 345 678.');
    const rawUid = String(input?.uid ?? '').trim();
    if (rawUid && !UID_RE.test(rawUid)) throw new Error("That account id doesn't look right.");
    const ref = SITEWIDE().doc(mobileKey(mobile)!);
    const prev = await ref.get();
    const uids = mergeUids(prev.exists ? prev.data()?.uids : [], rawUid || null, await uidsForMobile(mobile));
    await ref.set({
        mobile,
        uids,
        reason: cleanReason(input?.reason),
        createdBy: actor.uid,
        createdAt: prev.exists ? prev.data()?.createdAt ?? FieldValue.serverTimestamp() : FieldValue.serverTimestamp(),
        createdAtMs: prev.exists ? prev.data()?.createdAtMs ?? Date.now() : Date.now(),
        updatedAt: FieldValue.serverTimestamp(),
    });
    const open = await openOrdersFor({ mobile, uids });
    const cancelled = await endOpenRequests(open, 'blocked_sitewide', actor);
    return { mobile, cancelled };
}

export async function adminUnblockMobile(actor: BlockActor, mobileOrKey: string) {
    if (!isAdmin(actor)) throw new Error('Admins only.');
    const key = mobileKey(mobileOrKey) || (/^614\d{8}$/.test(String(mobileOrKey)) ? String(mobileOrKey) : null);
    if (!key) throw new Error('Block not found.');
    await SITEWIDE().doc(key).delete();
    return { removed: true };
}

export async function adminListBlocks(actor: BlockActor) {
    if (!isAdmin(actor)) throw new Error('Admins only.');
    const [site, sellers] = await Promise.all([
        SITEWIDE().limit(1000).get(),
        SELLER_BLOCKS().limit(3000).get(),
    ]);
    const sitewide = site.docs.map(toEntry).sort((a: BlockEntry, b: BlockEntry) => (b.createdAtMs || 0) - (a.createdAtMs || 0));
    const multi = multiSellerBlocks(sellers.docs.map(toEntry), sitewide.map((e: BlockEntry) => e.mobile || ''));
    return {
        sitewide: sitewide.map((e: BlockEntry) => ({
            id: e.id!, mobile: e.mobile ? formatAuMobile(e.mobile) : e.id!, e164: e.mobile || null,
            uids: e.uids || [], reason: e.reason || null, createdAtMs: e.createdAtMs || null,
        })),
        multiSeller: multi.map((m) => ({ ...m, display: formatAuMobile(m.mobile) })),
        sellerBlockCount: sellers.size,
    };
}
