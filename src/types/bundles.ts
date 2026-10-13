/**
 * Fixed-price bundles ("any 5 of these cards for $20").
 * Created by sellers from the seller dashboard; stored in the `bundles` collection.
 * Written only via server actions (Admin SDK); public read when active.
 */
export interface FixedPriceBundle {
    id: string;
    sellerId: string;
    sellerName?: string;
    name: string;
    description?: string;
    /** Explicitly picked listings. */
    listingIds: string[];
    /** Optional rule: every listing from this seller in this category is eligible. */
    category?: string | null;
    /** Optional rule: every listing from this seller carrying this tag/keyword is eligible. */
    tag?: string | null;
    /** N: how many items make one bundle. */
    quantity: number;
    /** Fixed price (AUD) for N items. */
    price: number;
    isActive: boolean;
    /** ISO strings (or Firestore Timestamps server-side). */
    startsAt?: any;
    endsAt?: any;
    /** Max bundles one buyer may claim over all orders (null = unlimited). */
    maxPerCustomer?: number | null;
    timesUsed?: number;
    createdAt?: any;
    updatedAt?: any;
}
