'use server';

import { ensureActionAuth } from '@/lib/action-utils';
import { evaluateSellerThresholds, loadSales, type SuperSellerStatus } from '@/lib/super-seller/server';
import { normalizeAbn, formatAbn } from '@/lib/super-seller/abn';
import { gstInclusiveBreakdown } from '@/lib/super-seller/gst';
import { isCompletedSaleStatus } from '@/lib/super-seller/policy';
import { firestoreDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

export type { SuperSellerStatus } from '@/lib/super-seller/server';
export async function getMySuperSellerStatusAction(idToken: string): Promise<{ success: true; status: SuperSellerStatus } | { success: false; error: string }> {
  try {
    const { uid } = await ensureActionAuth(idToken);
    return { success: true, status: await evaluateSellerThresholds(uid) };
  } catch (e: any) {
    return { success: false, error: e?.message || 'Could not load seller status.' };
  }
}

export async function saveSellerAbnAction(
  idToken: string,
  input: { abn: string; businessName?: string; gstRegistered: boolean },
): Promise<{ success: true; status: SuperSellerStatus } | { success: false; error: string }> {
  try {
    const { uid } = await ensureActionAuth(idToken);
    const abn = normalizeAbn(input?.abn);
    if (!abn) return { success: false, error: 'Enter a valid 11-digit Australian Business Number.' };
    const businessName = String(input?.businessName ?? '').trim().slice(0, 160) || null;
    const gstRegistered = input?.gstRegistered === true;

    await firestoreDb.collection('users').doc(uid).set({
      abn,
      ...(businessName ? { businessName } : {}),
      gstRegistered,
      abnUpdatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    // Denormalise the Super Seller flag onto this seller's listings (best effort).
    try {
      const products = await firestoreDb.collection('products').where('sellerId', '==', uid).limit(500).get();
      const batch = firestoreDb.batch();
      products.docs.forEach((d: FirebaseFirestore.QueryDocumentSnapshot) => batch.update(d.ref, { sellerIsSuperSeller: true }));
      if (!products.empty) await batch.commit();
    } catch (e) {
      console.warn('sellerIsSuperSeller backfill', e);
    }

    return { success: true, status: await evaluateSellerThresholds(uid) };
  } catch (e: any) {
    return { success: false, error: e?.message || 'Could not save ABN.' };
  }
}

export type SaleExportRow = {
  id: string;
  date: string;
  reference: string;
  buyerName: string;
  incGst: number;
  gst: number | null;
  exGst: number | null;
};

export async function exportSellerSalesAction(
  idToken: string,
  input?: { fromMs?: number; toMs?: number },
): Promise<{ success: true; rows: SaleExportRow[]; gstRegistered: boolean; abn: string | null } | { success: false; error: string }> {
  try {
    const { uid } = await ensureActionAuth(idToken);
    const status = await evaluateSellerThresholds(uid);
    const sales = await loadSales(uid);
    const fromMs = input?.fromMs ?? 0;
    const toMs = input?.toMs ?? Date.now();
    const rows: SaleExportRow[] = sales
      .filter((s) => isCompletedSaleStatus(s.status) && s.atMs >= fromMs && s.atMs <= toMs)
      .sort((a, b) => a.atMs - b.atMs)
      .map((s) => {
        const br = status.gstRegistered ? gstInclusiveBreakdown(s.amount) : null;
        return {
          id: s.id,
          date: new Date(s.atMs).toLocaleDateString('en-AU', { timeZone: 'Australia/Perth' }),
          reference: String(s.paymentReference || s.id),
          buyerName: s.buyerName || '',
          incGst: s.amount,
          gst: br ? br.gst : null,
          exGst: br ? br.exGst : null,
        };
      });
    return { success: true, rows, gstRegistered: status.gstRegistered, abn: status.abn };
  } catch (e: any) {
    return { success: false, error: e?.message || 'Could not export sales.' };
  }
}

export async function getOrderTaxInvoiceAction(
  idToken: string,
  orderId: string,
): Promise<
  | { success: true; invoice: { abn: string; businessName: string | null; gstRegistered: true; incGst: number; gst: number; exGst: number; reference: string } }
  | { success: true; invoice: null }
  | { success: false; error: string }
> {
  try {
    const { uid } = await ensureActionAuth(idToken);
    const snap = await firestoreDb.collection('orders').doc(String(orderId || '')).get();
    if (!snap.exists) return { success: false, error: 'Order not found.' };
    const order = snap.data() || {};
    const isBuyer = order.buyerId === uid;
    const isSeller = order.sellerId === uid;
    if (!isBuyer && !isSeller) return { success: false, error: 'Order not found.' };
    if (!isCompletedSaleStatus(order.status)) return { success: true, invoice: null };

    const sellerSnap = await firestoreDb.collection('users').doc(String(order.sellerId)).get();
    const seller = sellerSnap.data() || {};
    const abn = normalizeAbn(seller.abn);
    if (!abn || seller.gstRegistered !== true) return { success: true, invoice: null };
    const amount = Number(order.totalAmount ?? 0) || 0;
    const br = gstInclusiveBreakdown(amount);
    return {
      success: true,
      invoice: {
        abn: formatAbn(abn),
        businessName: seller.businessName || seller.abnBusinessName || seller.storeName || null,
        gstRegistered: true,
        incGst: br.incGst,
        gst: br.gst,
        exGst: br.exGst,
        reference: String(order.paymentReference || order.payIdReference || snap.id),
      },
    };
  } catch (e: any) {
    return { success: false, error: e?.message || 'Could not load tax summary.' };
  }
}
