'use server';

import { firestoreDb } from '@/lib/firebase/admin';
import { serializeFirestoreData } from '@/lib/utils/serialization';
import { isBundleTier, tierGroupFor } from '@/lib/tier-bundles';
import { isLineEligible, productTags } from '@/lib/bundles';
import type { FixedPriceBundle } from '@/types/bundles';
import type { Product } from '@/lib/types';

export interface MultibuyEligibleItemsResult {
  sellerId: string;
  sellerName?: string;
  tier?: string | null;
  bundle?: FixedPriceBundle | null;
  quotaRequired: number;
  products: Product[];
}

/**
 * Loads all active available listings from the same seller that are eligible
 * for the seller's multibuy tier deal or fixed-price bundle.
 */
export async function getSellerMultibuyEligibleItems(params: {
  sellerId: string;
  currentProductId?: string;
  tier?: string | null;
  bundleId?: string | null;
  limit?: number;
}): Promise<MultibuyEligibleItemsResult> {
  const { sellerId, currentProductId, tier, bundleId, limit = 50 } = params;

  try {
    if (!sellerId) {
      return { sellerId: '', quotaRequired: 0, products: [] };
    }

    // 1. If bundleId specified, load by fixed-price bundle eligibility
    if (bundleId) {
      const bDoc = await firestoreDb.collection('bundles').doc(String(bundleId)).get();
      if (bDoc.exists) {
        const bData = bDoc.data();
        const bundle: FixedPriceBundle = { id: bDoc.id, ...bData } as any;
        const snap = await firestoreDb.collection('products')
          .where('sellerId', '==', sellerId)
          .where('status', '==', 'available')
          .limit(300)
          .get();

        const allDocs = snap.docs.map((d: any) => ({ id: d.id, ...d.data() })) as any[];
        const eligible = allDocs
          .filter((p) => p.id !== currentProductId)
          .filter((p) => isLineEligible(bundle, { id: p.id, sellerId: p.sellerId, category: p.category, tags: productTags(p) }))
          .slice(0, limit);

        return {
          sellerId,
          sellerName: bundle.sellerName,
          bundle,
          quotaRequired: bundle.quantity || 5,
          products: serializeFirestoreData(eligible),
        };
      }
    }

    // 2. Multibuy Tier (Bronze / Silver / Gold) or seller multibuy
    let query: any = firestoreDb.collection('products')
      .where('sellerId', '==', sellerId)
      .where('status', '==', 'available');

    if (tier && isBundleTier(tier)) {
      query = query.where('multiCardTier', '==', tier);
    } else {
      query = query.where('multibuyEnabled', '==', true);
    }

    const snap = await query.limit(100).get();
    const allEligible = snap.docs
      .map((d: any) => ({ id: d.id, ...d.data() }))
      .filter((p: any) => p.id !== currentProductId)
      .slice(0, limit) as Product[];

    return {
      sellerId,
      tier: tier || null,
      quotaRequired: 5, // Default tier bundle quota threshold
      products: serializeFirestoreData(allEligible),
    };
  } catch (err) {
    console.error('getSellerMultibuyEligibleItems error:', err);
    return { sellerId, quotaRequired: 0, products: [] };
  }
}
