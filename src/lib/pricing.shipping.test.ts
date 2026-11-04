import { describe, it, expect } from 'vitest';
import { calculateCombinedShipping, calculateShipping } from './pricing';

const S = { freightCharge: 12, freeShippingThreshold: 150 };

describe('calculateCombinedShipping', () => {
  it('charges one fee for many items from the same seller', () => {
    const r = calculateCombinedShipping([{ sellerId: 'a', total: 5 }, { sellerId: 'a', total: 7 }, { sellerId: 'a', total: 3 }], 'shipping', S);
    expect(r.total).toBe(12);
    expect(r.sellerCount).toBe(1);
  });
  it('charges one fee per seller', () => {
    const r = calculateCombinedShipping([{ sellerId: 'a', total: 5 }, { sellerId: 'b', total: 7 }, { sellerId: 'a', total: 3 }], 'shipping', S);
    expect(r.total).toBe(24);
    expect(r.perSeller).toEqual({ a: 12, b: 12 });
  });
  it('is free per seller once that seller subtotal reaches the threshold', () => {
    const r = calculateCombinedShipping([{ sellerId: 'a', total: 100 }, { sellerId: 'a', total: 50 }, { sellerId: 'b', total: 20 }], 'shipping', S);
    expect(r.perSeller).toEqual({ a: 0, b: 12 });
    expect(r.total).toBe(12);
  });
  it('is zero for pickup and for an empty cart', () => {
    expect(calculateCombinedShipping([{ sellerId: 'a', total: 5 }], 'pickup', S).total).toBe(0);
    expect(calculateCombinedShipping([], 'shipping', S).total).toBe(0);
  });
  it('matches the per-seller server rule', () => {
    const lines = [{ sellerId: 'a', total: 40 }, { sellerId: 'a', total: 9.99 }];
    expect(calculateCombinedShipping(lines, 'shipping', S).total).toBe(calculateShipping(49.99, 'shipping', S));
  });
});
