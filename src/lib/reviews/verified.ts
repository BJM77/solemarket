/** Pure helpers for verified-purchase reviews (unit tested). */
export const REVIEWABLE_ORDER_STATUSES = ['delivered', 'completed'] as const;

export interface OrderLike {
  id: string;
  buyerId: string;
  sellerId: string;
  status: string;
  items?: Array<{ id: string; title?: string }>;
}

/** Deterministic review id: one review per order line, so retries/double-clicks can't duplicate. */
export function reviewDocId(orderId: string, productId: string): string {
  return `${orderId}_${productId}`.replace(/[^a-zA-Z0-9_-]/g, '_');
}

/** Find the buyer's completed order that contains this product. */
export function findReviewableOrder(orders: OrderLike[], buyerId: string, productId: string): OrderLike | null {
  return (
    orders.find(
      (o) =>
        o.buyerId === buyerId &&
        (REVIEWABLE_ORDER_STATUSES as readonly string[]).includes(o.status) &&
        (o.items || []).some((i) => i.id === productId)
    ) || null
  );
}

/** Incrementally update an average rating. */
export function nextRating(prev: { ratingSum?: number; reviewCount?: number }, rating: number) {
  const ratingSum = (prev.ratingSum || 0) + rating;
  const reviewCount = (prev.reviewCount || 0) + 1;
  return { ratingSum, reviewCount, sellerRating: Math.round((ratingSum / reviewCount) * 10) / 10 };
}
