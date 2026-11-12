import 'server-only';

import { firestoreDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { normalizeAbn, formatAbn } from '@/lib/super-seller/abn';
import { listingPauseState, saleTimestampMs, summarizeSales } from '@/lib/super-seller/policy';
import {
  GST_REGISTRATION_THRESHOLD_AUD,
  PAUSE_NEW_LISTINGS_MESSAGE,
  SUPER_SELLER_ABN_GRACE_DAYS,
  SUPER_SELLER_SALES_AMOUNT_30D_AUD,
  SUPER_SELLER_SALES_COUNT_7D,
} from '@/lib/super-seller/config';

export type SuperSellerStatus = {
  hasValidAbn: boolean;
  abn: string | null;
  abnFormatted: string | null;
  businessName: string | null;
  gstRegistered: boolean;
  count7d: number;
  amount30d: number;
  exceedsThreshold: boolean;
  shouldPrompt: boolean;
  newListingsPaused: boolean;
  graceEndsAtMs: number | null;
  graceDaysLeft: number | null;
  pauseMessage: string | null;
  gstThresholdAud: number;
  salesCountThreshold: number;
  salesAmountThreshold: number;
  graceDays: number;
};

export async function loadSales(sellerId: string) {
  const col = firestoreDb.collection('orders');
  let docs: any[] = [];
  try {
    const snap = await col.where('sellerId', '==', sellerId).where('status', 'in', ['paid', 'completed']).limit(500).get();
    docs = snap.docs;
  } catch {
    const snap = await col.where('sellerId', '==', sellerId).limit(500).get();
    docs = snap.docs.filter((d: FirebaseFirestore.QueryDocumentSnapshot) => ['paid', 'completed'].includes(String(d.data().status || '')));
  }
  return docs.map((d: FirebaseFirestore.QueryDocumentSnapshot) => {
    const x = d.data();
    return {
      id: d.id,
      amount: Number(x.totalAmount ?? x.offerAmount ?? 0) || 0,
      atMs: saleTimestampMs(x) || 0,
      status: x.status,
      paidAt: x.paidAt,
      paymentReference: x.paymentReference || x.payIdReference || d.id,
      buyerName: x.buyerName || null,
      items: x.items || [],
    };
  });
}

function promptedMs(data: any): number | null {
  const v = data?.abnPromptedAt;
  if (v?.toMillis) return v.toMillis();
  if (typeof v === 'number') return v;
  if (v instanceof Date) return v.getTime();
  return null;
}

export async function evaluateSellerThresholds(sellerId: string, now = Date.now()): Promise<SuperSellerStatus> {
  const userRef = firestoreDb.collection('users').doc(sellerId);
  const userSnap = await userRef.get();
  const data = userSnap.data() || {};
  const abn = normalizeAbn(data.abn);
  const sales = await loadSales(sellerId);
  const summary = summarizeSales(sales, now);
  let abnPromptedAtMs = promptedMs(data);

  if (!abn && summary.exceedsThreshold && !abnPromptedAtMs) {
    await userRef.set({ abnPromptedAt: FieldValue.serverTimestamp() }, { merge: true });
    abnPromptedAtMs = now;
  }

  const pause = listingPauseState({
    hasValidAbn: !!abn,
    salesExceedThreshold: summary.exceedsThreshold,
    abnPromptedAtMs,
    now,
  });

  return {
    hasValidAbn: !!abn,
    abn,
    abnFormatted: abn ? formatAbn(abn) : null,
    businessName: data.businessName || data.abnBusinessName || null,
    gstRegistered: data.gstRegistered === true,
    count7d: summary.count7d,
    amount30d: summary.amount30d,
    exceedsThreshold: summary.exceedsThreshold,
    shouldPrompt: pause.shouldPrompt,
    newListingsPaused: pause.newListingsPaused,
    graceEndsAtMs: pause.graceEndsAtMs,
    graceDaysLeft: pause.graceDaysLeft,
    pauseMessage: pause.newListingsPaused ? PAUSE_NEW_LISTINGS_MESSAGE : null,
    gstThresholdAud: GST_REGISTRATION_THRESHOLD_AUD,
    salesCountThreshold: SUPER_SELLER_SALES_COUNT_7D,
    salesAmountThreshold: SUPER_SELLER_SALES_AMOUNT_30D_AUD,
    graceDays: SUPER_SELLER_ABN_GRACE_DAYS,
  };
}

export async function assertNewListingsAllowed(sellerId: string, role?: string): Promise<void> {
  if (role === 'admin' || role === 'superadmin') return;
  const status = await evaluateSellerThresholds(sellerId);
  if (status.newListingsPaused) throw new Error(PAUSE_NEW_LISTINGS_MESSAGE);
}

