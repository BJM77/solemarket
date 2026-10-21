'use client';

import { useEffect, useState } from 'react';
import type { Query } from 'firebase/firestore';
import { loadFirebase } from '@/lib/firebase/lazy';
import type { Product } from '@/lib/types';

export interface ProvenanceData {
  listedDate: Date;
  daysListed: number;
  uniqueViews: number;
  /** null when the count can't be read by this visitor (rules) or failed. */
  watchlistCount: number | null;
  /** null unless the viewer is the seller (guest_enquiries is seller/admin-only). */
  enquiryCount: number | null;
  hasSufficientData: boolean; // gate the render
}

export const MIN_UNIQUE_VIEWS = 5; // don't show a ledger for brand-new listings

/**
 * Decide which Firestore count queries are worth running. Public visitors used
 * to fire a guest_enquiries aggregation that the security rules always deny
 * (seller/admin only), logging "Missing or insufficient permissions" on every
 * listing view and throwing away the whole ledger.
 */
export function planProvenanceQueries(input: {
  uniqueViews: number;
  viewerUid?: string | null;
  sellerId?: string | null;
}): { countWatchlist: boolean; countEnquiries: boolean } {
  if (input.uniqueViews < MIN_UNIQUE_VIEWS) return { countWatchlist: false, countEnquiries: false };
  const isSeller = !!input.viewerUid && !!input.sellerId && input.viewerUid === input.sellerId;
  return { countWatchlist: true, countEnquiries: isSeller };
}

function toListedDate(raw: unknown): Date {
  const r = raw as any;
  if (r instanceof Date) return r;
  if (typeof r?.toDate === 'function') return r.toDate();
  if (typeof r?.seconds === 'number') return new Date(r.seconds * 1000);
  return new Date();
}

async function safeCount(q: Query): Promise<number | null> {
  const { fs: { getCountFromServer } } = await loadFirebase();
  try {
    const snap = await getCountFromServer(q);
    return snap.data().count;
  } catch (err: any) {
    if (err?.code !== 'permission-denied') console.warn('[Provenance] count unavailable:', err?.message || err);
    return null;
  }
}

export function useProvenanceData(product: Product | null): ProvenanceData | null {
  const [data, setData] = useState<ProvenanceData | null>(null);

  useEffect(() => {
    if (!product?.id) {
      setData(null);
      return;
    }

    let cancelled = false;

    (async () => {
      const listedDate = toListedDate(product.createdAt);
      const daysListed = Math.max(
        0,
        Math.floor((Date.now() - listedDate.getTime()) / (1000 * 60 * 60 * 24))
      );
      const uniqueViews = product.uniqueViews ?? 0;
      const { db, auth, fs: { collection, collectionGroup, query, where } } = await loadFirebase();
      if (cancelled) return;

      // Only the seller can count enquiries; wait for Firebase Auth to restore
      // the session so we know who is viewing (skipped for low-view listings).
      if (uniqueViews >= MIN_UNIQUE_VIEWS) {
        try { await auth?.authStateReady?.(); } catch { /* treat as signed out */ }
      }
      if (cancelled) return;

      const plan = planProvenanceQueries({
        uniqueViews,
        viewerUid: auth?.currentUser?.uid ?? null,
        sellerId: product.sellerId,
      });

      const [watchlistCount, enquiryCount] = await Promise.all([
        plan.countWatchlist
          ? safeCount(query(collectionGroup(db, 'favorites'), where('productId', '==', product.id)))
          : Promise.resolve(null),
        plan.countEnquiries
          ? safeCount(query(collection(db, 'guest_enquiries'), where('productId', '==', product.id)))
          : Promise.resolve(null),
      ]);

      if (cancelled) return;

      setData({
        listedDate,
        daysListed,
        uniqueViews,
        watchlistCount,
        enquiryCount,
        hasSufficientData: uniqueViews >= MIN_UNIQUE_VIEWS,
      });
    })();

    return () => { cancelled = true; };
  }, [product?.id, product?.createdAt, product?.uniqueViews, product?.sellerId]);

  return data;
}
