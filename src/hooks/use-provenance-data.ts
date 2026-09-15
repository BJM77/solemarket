'use client';

import { useEffect, useState } from 'react';
import {
  collection,
  collectionGroup,
  query,
  where,
  getCountFromServer,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import type { Product } from '@/lib/types';

export interface ProvenanceData {
  listedDate: Date;
  daysListed: number;
  uniqueViews: number;
  watchlistCount: number;
  enquiryCount: number;
  hasSufficientData: boolean; // gate the render
}

const MIN_UNIQUE_VIEWS = 5; // don't show a ledger for brand-new listings

export function useProvenanceData(product: Product | null): ProvenanceData | null {
  const [data, setData] = useState<ProvenanceData | null>(null);

  useEffect(() => {
    if (!product?.id) {
      setData(null);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        // 1. Real listed date from createdAt
        const raw = product.createdAt as any;
        const listedDate: Date =
          raw instanceof Date ? raw :
          typeof raw?.toDate === 'function' ? raw.toDate() :
          typeof raw?.seconds === 'number' ? new Date(raw.seconds * 1000) :
          new Date();

        const daysListed = Math.max(
          0,
          Math.floor((Date.now() - listedDate.getTime()) / (1000 * 60 * 60 * 24))
        );

        // 2. Real unique views — already tracked on the product
        const uniqueViews = product.uniqueViews ?? 0;

        // 3. Real watchlist count — collectionGroup query on favorites
        const favoritesQuery = query(
          collectionGroup(db, 'favorites'),
          where('productId', '==', product.id)
        );
        const favoritesSnap = await getCountFromServer(favoritesQuery);
        const watchlistCount = favoritesSnap.data().count;

        // 4. Real enquiry count — from guest_enquiries
        const enquiriesQuery = query(
          collection(db, 'guest_enquiries'),
          where('productId', '==', product.id)
        );
        const enquiriesSnap = await getCountFromServer(enquiriesQuery);
        const enquiryCount = enquiriesSnap.data().count;

        if (cancelled) return;

        setData({
          listedDate,
          daysListed,
          uniqueViews,
          watchlistCount,
          enquiryCount,
          hasSufficientData: uniqueViews >= MIN_UNIQUE_VIEWS,
        });
      } catch (err) {
        console.error('[Provenance] Failed to load real data:', err);
        if (!cancelled) setData(null);
      }
    })();

    return () => { cancelled = true; };
  }, [product?.id, product?.createdAt, product?.uniqueViews]);

  return data;
}
