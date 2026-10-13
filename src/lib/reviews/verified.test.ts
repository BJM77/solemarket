import { describe, it, expect } from 'vitest';
import { findReviewableOrder, reviewDocId, nextRating } from './verified';

const orders = [
  { id: 'o1', buyerId: 'b', sellerId: 's', status: 'awaiting_payment', items: [{ id: 'p1' }] },
  { id: 'o2', buyerId: 'b', sellerId: 's', status: 'delivered', items: [{ id: 'p1' }, { id: 'p2' }] },
];

describe('verified reviews', () => {
  it('only accepts delivered/completed orders containing the product', () => {
    expect(findReviewableOrder(orders, 'b', 'p1')?.id).toBe('o2');
    expect(findReviewableOrder(orders, 'b', 'p3')).toBeNull();
    expect(findReviewableOrder(orders, 'x', 'p1')).toBeNull();
  });
  it('builds stable ids', () => {
    expect(reviewDocId('o2', 'p/1')).toBe('o2_p_1');
  });
  it('updates averages', () => {
    expect(nextRating({}, 5)).toEqual({ ratingSum: 5, reviewCount: 1, sellerRating: 5 });
    expect(nextRating({ ratingSum: 9, reviewCount: 2 }, 3)).toEqual({ ratingSum: 12, reviewCount: 3, sellerRating: 4 });
  });
});
