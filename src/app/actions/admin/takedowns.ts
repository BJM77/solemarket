
'use server';

import { firestoreDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { ensureActionAuth } from '@/lib/action-utils';
import { adminBlockMobile } from '@/lib/checkout/blocks-server';
import { rejectAllBidsForProduct } from '@/app/actions/marketplace/bidding';
import { logActivity } from '@/services/activity-logs';
import { revalidatePath, revalidateTag } from 'next/cache';

type Result<T = object> = ({ success: true } & T) | { success: false; error: string };
const fail = (e: any): { success: false; error: string } => ({ success: false, error: e?.message || 'Something went wrong. Please try again.' });

async function admin(idToken: string) {
  const { uid, role, email, name } = await ensureActionAuth(idToken);
  if (role !== 'admin' && role !== 'superadmin') throw new Error('Admins only.');
  return { uid, role, email, name };
}

function toMs(v: any): number | null {
  if (v?.toMillis) return v.toMillis();
  if (typeof v === 'number') return v;
  if (v instanceof Date) return v.getTime();
  return null;
}

export type TakedownRequestRow = {
  id: string;
  name: string;
  organisation: string | null;
  email: string;
  listingUrls: string[];
  listingIds: string[];
  type: string;
  description: string;
  status: 'new' | 'actioned' | 'rejected';
  createdAtMs: number | null;
  actionedAtMs: number | null;
  actionNote: string | null;
};

function row(d: FirebaseFirestore.DocumentSnapshot): TakedownRequestRow {
  const x = d.data() || {};
  return {
    id: d.id,
    name: x.name || '',
    organisation: x.organisation || null,
    email: x.email || '',
    listingUrls: Array.isArray(x.listingUrls) ? x.listingUrls : [],
    listingIds: Array.isArray(x.listingIds) ? x.listingIds : [],
    type: x.type || 'other',
    description: x.description || '',
    status: x.status === 'actioned' || x.status === 'rejected' ? x.status : 'new',
    createdAtMs: toMs(x.createdAt),
    actionedAtMs: toMs(x.actionedAt),
    actionNote: x.actionNote || null,
  };
}

export async function listTakedownRequestsAction(idToken: string): Promise<Result<{ requests: TakedownRequestRow[] }>> {
  try {
    await admin(idToken);
    const snap = await firestoreDb.collection('takedown_requests').orderBy('createdAt', 'desc').limit(200).get();
    return { success: true, requests: snap.docs.map(row) };
  } catch (e) {
    return fail(e);
  }
}

async function setStatus(id: string, actor: { uid: string }, status: 'actioned' | 'rejected', note: string) {
  const ref = firestoreDb.collection('takedown_requests').doc(id);
  const snap = await ref.get();
  if (!snap.exists) throw new Error('Report not found.');
  await ref.update({
    status,
    actionNote: note,
    actionedBy: actor.uid,
    actionedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function rejectTakedownRequestAction(idToken: string, requestId: string): Promise<Result> {
  try {
    const actor = await admin(idToken);
    await setStatus(String(requestId || ''), actor, 'rejected', 'Marked rejected');
    return { success: true };
  } catch (e) {
    return fail(e);
  }
}

export async function removeListingForTakedownAction(idToken: string, requestId: string, productId: string): Promise<Result> {
  try {
    const actor = await admin(idToken);
    const pid = String(productId || '').trim();
    if (!pid) throw new Error('Listing id is required.');

    const productRef = firestoreDb.collection('products').doc(pid);
    const productSnap = await productRef.get();
    if (!productSnap.exists) throw new Error('Listing not found.');
    const product = productSnap.data() || {};

    await productRef.update({
      status: 'deleted',
      deletedAt: new Date(),
      updatedAt: new Date(),
      takedownRequestId: requestId || null,
    });

    try {
      await rejectAllBidsForProduct(pid, 'Removed after an infringement report');
    } catch (e) {
      console.warn('rejectAllBidsForProduct', e);
    }

    await logActivity({
      action: 'product_deleted',
      resourceId: pid,
      resourceType: 'product',
      performedBy: { uid: actor.uid, email: actor.email, displayName: actor.name, role: actor.role || 'admin' },
      details: { productTitle: product.title, originalStatus: product.status, reason: 'Infringement report', requestId },
    });

    await setStatus(String(requestId || ''), actor, 'actioned', `Removed listing ${pid}`);
    revalidatePath(`/product/${pid}`);
    revalidateTag('products');
    return { success: true };
  } catch (e) {
    return fail(e);
  }
}

async function sellerMobileFor(sellerId: string): Promise<{ mobile: string; uid: string } | null> {
  const userSnap = await firestoreDb.collection('users').doc(sellerId).get();
  const data = userSnap.data() || {};
  const phone = data.phoneNumber || data.phone || data.mobile;
  if (phone) return { mobile: String(phone), uid: sellerId };
  try {
    const payout = await firestoreDb.collection('users').doc(sellerId).collection('private').doc('payout').get();
    const p = payout.data() || {};
    if (p.payIdType === 'phone' && p.payId) return { mobile: String(p.payId), uid: sellerId };
  } catch { /* ignore */ }
  return null;
}

export async function blockSellerMobileForTakedownAction(idToken: string, requestId: string, productId?: string, sellerId?: string): Promise<Result<{ cancelled: number }>> {
  try {
    const actor = await admin(idToken);
    let sid = String(sellerId || '').trim();
    const pid = String(productId || '').trim();
    if (!sid && pid) {
      const productSnap = await firestoreDb.collection('products').doc(pid).get();
      sid = String(productSnap.data()?.sellerId || '');
    }
    if (!sid) throw new Error('No seller is linked to this report.');

    const found = await sellerMobileFor(sid);
    if (!found) {
      throw new Error('This seller has no mobile number on file. Block the number from Blocked Mobiles if you have it.');
    }

    const r = await adminBlockMobile(actor, { mobile: found.mobile, uid: found.uid, reason: `Infringement report ${requestId || ''}`.trim() });
    await setStatus(String(requestId || ''), actor, 'actioned', `Blocked seller mobile for ${sid}`);
    return { success: true, cancelled: r.cancelled };
  } catch (e) {
    return fail(e);
  }
}
