import { describe, it, expect } from 'vitest';
import { priceCart, bundleProgress, isBundleLive, splitProRata, type PricingLine } from './bundles';
import { calculateItemTotal, sanitizeMultibuyTiers, clampDiscountPercent } from './pricing';
import type { FixedPriceBundle } from '@/types/bundles';

const bundle = (o: Partial<FixedPriceBundle> = {}): FixedPriceBundle => ({
    id: 'b1', sellerId: 's1', name: 'Any 5 for $20', listingIds: [], category: 'Collector Cards',
    quantity: 5, price: 20, isActive: true, ...o,
});
const card = (id: string, unitPrice: number, o: Partial<PricingLine> = {}): PricingLine => ({
    id, sellerId: 's1', category: 'Collector Cards', unitPrice, quantity: 1, ...o,
});

describe('fixed-price bundles', () => {
    it('5 eligible cards are charged the fixed price', () => {
        const r = priceCart([1, 2, 3, 4, 5].map((p, i) => card(`c${i}`, p * 2)), [bundle()]);
        expect(r.subtotal).toBe(20);
        expect(r.originalSubtotal).toBe(30);
        expect(r.bundles).toEqual([expect.objectContaining({ bundleId: 'b1', count: 1, price: 20 })]);
        // pro-rata split adds up exactly
        expect(r.lines.reduce((a, l) => a + l.total, 0)).toBeCloseTo(20, 10);
    });

    it('4 eligible cards: no bundle, full price', () => {
        const r = priceCart([card('a', 6), card('b', 6), card('c', 6), card('d', 6)], [bundle()]);
        expect(r.subtotal).toBe(24);
        expect(r.bundles).toHaveLength(0);
    });

    it('bundles the most expensive eligible items, leftovers at full price', () => {
        const lines = [card('cheap', 1), ...[10, 9, 8, 7, 6].map((p, i) => card(`x${i}`, p))];
        const r = priceCart(lines, [bundle()]);
        expect(r.lines[0].total).toBe(1);
        expect(r.lines[0].bundledUnits).toBe(0);
        expect(r.subtotal).toBe(21);
    });

    it('mixed eligible and ineligible items', () => {
        const lines = [
            ...[5, 5, 5, 5, 5].map((p, i) => card(`c${i}`, p)),
            card('shoe', 100, { category: 'Sneakers' }),
        ];
        const r = priceCart(lines, [bundle()]);
        expect(r.subtotal).toBe(120);
        expect(r.lines[5].bundleIds).toEqual([]);
    });

    it('10 items = 2 bundles, 11 items = 2 bundles + 1 at full price', () => {
        const ten = Array.from({ length: 10 }, (_, i) => card(`c${i}`, 6));
        expect(priceCart(ten, [bundle()]).subtotal).toBe(40);
        expect(priceCart(ten, [bundle()]).bundles[0].count).toBe(2);
        const eleven = [...ten, card('c10', 6)];
        expect(priceCart(eleven, [bundle()]).subtotal).toBe(46);
    });

    it('quantity > 1 on one line counts as several units', () => {
        const r = priceCart([card('a', 6, { quantity: 5 })], [bundle()]);
        expect(r.subtotal).toBe(20);
    });

    it('multiple sellers: each seller only bundles their own items', () => {
        const lines = [
            ...[6, 6, 6].map((p, i) => card(`a${i}`, p)),
            ...[6, 6].map((p, i) => card(`b${i}`, p, { sellerId: 's2' })),
        ];
        const r = priceCart(lines, [bundle(), bundle({ id: 'b2', sellerId: 's2' })]);
        expect(r.bundles).toHaveLength(0);
        expect(r.subtotal).toBe(30);
        const both = priceCart([...lines, card('a3', 6), card('a4', 6)], [bundle(), bundle({ id: 'b2', sellerId: 's2' })]);
        expect(both.subtotal).toBe(20 + 12);
    });

    it('never charges more than buying individually', () => {
        const r = priceCart([1, 1, 1, 1, 1].map((p, i) => card(`c${i}`, p)), [bundle()]);
        expect(r.subtotal).toBe(5);
        expect(r.bundles).toHaveLength(0);
    });

    it('explicit listing picks + inactive / expired / future bundles', () => {
        const picked = bundle({ category: null, listingIds: ['a', 'b'], quantity: 2, price: 5 });
        const lines = [card('a', 4), card('b', 4), card('c', 4)];
        expect(priceCart(lines, [picked]).subtotal).toBe(9);
        expect(priceCart(lines, [{ ...picked, isActive: false }]).subtotal).toBe(12);
        expect(priceCart(lines, [{ ...picked, endsAt: '2000-01-01' }]).subtotal).toBe(12);
        expect(priceCart(lines, [{ ...picked, startsAt: '2999-01-01' }]).subtotal).toBe(12);
        expect(isBundleLive({ ...picked, price: 0 })).toBe(false);
    });

    it('tag rule', () => {
        const b = bundle({ category: null, tag: 'pokemon', quantity: 2, price: 5 });
        const r = priceCart([card('a', 4, { tags: ['Pokemon'] }), card('b', 4, { tags: ['pokemon'] }), card('c', 4)], [b]);
        expect(r.subtotal).toBe(9);
    });

    it('allowance caps how many bundles apply (maxPerCustomer)', () => {
        const ten = Array.from({ length: 10 }, (_, i) => card(`c${i}`, 6));
        expect(priceCart(ten, [bundle()], { allowance: { b1: 1 } }).subtotal).toBe(50);
        expect(priceCart(ten, [bundle()], { allowance: { b1: 0 } }).subtotal).toBe(60);
    });

    it('leftover units fall back to multibuy tiers; bundled units do not count', () => {
        const tiers = [{ minQuantity: 2, discountPercent: 10 }];
        const lines = Array.from({ length: 7 }, (_, i) => card(`c${i}`, 10, { multibuyEnabled: true, multibuyTiers: tiers }));
        const r = priceCart(lines, [bundle({ price: 30 })]);
        // 5 bundled for $30, 2 leftovers at 10% off = 18
        expect(r.subtotal).toBe(48);
    });

    it('deal-priced lines are excluded', () => {
        const lines = [card('d', 50, { fixedTotal: 10 }), ...[6, 6, 6, 6].map((p, i) => card(`c${i}`, p))];
        const r = priceCart(lines, [bundle()]);
        expect(r.subtotal).toBe(34);
    });

    it('progress label', () => {
        const b = bundle();
        expect(bundleProgress(b, [card('a', 4), card('b', 4), card('c', 4)]).label).toBe('Add 2 more for 5 for $20');
        expect(bundleProgress(b, Array.from({ length: 5 }, (_, i) => card(`c${i}`, 4))).label).toBe('5 for $20 applied');
        expect(bundleProgress(b, []).label).toBe('Add 5 more for 5 for $20');
    });

    it('splitProRata is exact to the cent', () => {
        const s = splitProRata(1000, [1, 1, 1]);
        expect(s.reduce((a, b) => a + b, 0)).toBe(1000);
    });
});

describe('multibuy tier caps', () => {
    it('caps discounts at 90% and never goes negative', () => {
        expect(calculateItemTotal(10, 1, true, [{ minQuantity: 2, discountPercent: 150 }], 2)).toBeCloseTo(1);
        expect(calculateItemTotal(10, 1, true, [{ minQuantity: 2, discountPercent: -20 }], 2)).toBe(10);
        expect(clampDiscountPercent('abc')).toBe(0);
    });
    it('sanitizes tiers', () => {
        expect(sanitizeMultibuyTiers([
            { minQuantity: 5, discountPercent: 95 }, { minQuantity: 1, discountPercent: 10 },
            { minQuantity: 3, discountPercent: 10 }, { minQuantity: 3, discountPercent: 20 },
        ])).toEqual([{ minQuantity: 3, discountPercent: 10 }, { minQuantity: 5, discountPercent: 90 }]);
        expect(sanitizeMultibuyTiers('x')).toEqual([]);
    });
    it('5 x $4 at 20% = $16; 4 items no discount', () => {
        const t = [{ minQuantity: 5, discountPercent: 20 }];
        expect(calculateItemTotal(4, 5, true, t, 5)).toBeCloseTo(16);
        expect(calculateItemTotal(4, 4, true, t, 4)).toBe(16);
    });
});

import { validateBundleInput } from './bundles';
describe('validateBundleInput', () => {
    it('accepts a valid bundle and normalises', () => {
        const b = validateBundleInput({ name: 'Any 5 for $20', quantity: '5', price: '20', listingIds: ['a', 'a', 'b'], isActive: true, tag: ' Pokemon ' });
        expect(b).toMatchObject({ quantity: 5, price: 20, listingIds: ['a', 'b'], tag: 'pokemon', maxPerCustomer: null });
    });
    it('rejects bad input', () => {
        expect(() => validateBundleInput({ name: 'x', quantity: 5, price: 20, category: 'C' })).toThrow();
        expect(() => validateBundleInput({ name: 'Bundle', quantity: 1, price: 20, category: 'C' })).toThrow();
        expect(() => validateBundleInput({ name: 'Bundle', quantity: 5, price: 0, category: 'C' })).toThrow();
        expect(() => validateBundleInput({ name: 'Bundle', quantity: 5, price: 20 })).toThrow(/Pick/);
        expect(() => validateBundleInput({ name: 'Bundle', quantity: 5, price: 20, category: 'C', startsAt: '2026-02-01', endsAt: '2026-01-01' })).toThrow();
    });
});
