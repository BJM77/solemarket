import { describe, it, expect } from 'vitest';
import { buildOrderPricing, parseDealId, OrderPricingError } from './order-pricing';
import type { Product } from '@/lib/types';
import type { Deal } from '@/types/deals';
import type { FixedPriceBundle } from '@/types/bundles';

const product = (id: string, price: number, o: Partial<Product> & Record<string, any> = {}): Product => ({
    id, title: id, price, sellerId: 's1', category: 'Collector Cards', status: 'available', quantity: 5, ...o,
} as any);
const deal = (o: Partial<Deal> = {}): Deal => ({
    id: 'DEAL1', code: 'X', name: 'Starter', description: '', price: 20, isActive: true,
    requirements: { bronze: 1, silver: 1, gold: 0, platinum: 0 }, createdAt: null as any, createdBy: 'a', timesUsed: 0, ...o,
});

describe('createOrderAction pricing (server-side)', () => {
    it('EXPLOIT: fake dealId with bundlePrice 0.01 is rejected', () => {
        expect(() => buildOrderPricing({
            items: [{ id: 'p1', quantity: 1, dealId: 'fake-1700000000000', bundlePrice: 0.01 }],
            products: [product('p1', 500)],
            deals: { fake: null },
            bundles: [],
        })).toThrow(OrderPricingError);
    });

    it('EXPLOIT: real deal but client bundlePrice is ignored (server splits deal price)', () => {
        const r = buildOrderPricing({
            items: [
                { id: 'b', quantity: 1, dealId: 'DEAL1-1700000000000', bundlePrice: 0.01 },
                { id: 's', quantity: 1, dealId: 'DEAL1-1700000000000', bundlePrice: 0.01 },
            ],
            products: [product('b', 4, { multiCardTier: 'bronze' }), product('s', 16, { multiCardTier: 'silver' })],
            deals: { DEAL1: deal({ price: 15 }) },
            bundles: [],
        });
        expect(r.pricing.subtotal).toBe(15);
        expect(r.lineTotals).toEqual([3, 12]);
        expect(r.dealUsage).toEqual({ DEAL1: 1 });
    });

    it('EXPLOIT: no dealId + bundlePrice is charged the full price', () => {
        const r = buildOrderPricing({ items: [{ id: 'p1', quantity: 1, bundlePrice: 0.01 }], products: [product('p1', 500)], deals: {}, bundles: [] });
        expect(r.pricing.subtotal).toBe(500);
    });

    it('rejects inactive, expired and wrongly-filled deals', () => {
        const items = [{ id: 'b', quantity: 1, dealId: 'DEAL1-1700000000000' }, { id: 's', quantity: 1, dealId: 'DEAL1-1700000000000' }];
        const products = [product('b', 4, { multiCardTier: 'bronze' }), product('s', 16, { multiCardTier: 'silver' })];
        expect(() => buildOrderPricing({ items, products, deals: { DEAL1: deal({ isActive: false }) }, bundles: [] })).toThrow(/no longer active/);
        expect(() => buildOrderPricing({ items, products, deals: { DEAL1: deal({ validUntil: new Date('2000-01-01') as any }) }, bundles: [] })).toThrow(/expired/);
        expect(() => buildOrderPricing({
            items, products: [products[0], product('s', 16, { multiCardTier: 'bronze' })], deals: { DEAL1: deal() }, bundles: [],
        })).toThrow(/exactly/);
        expect(() => buildOrderPricing({
            items: [{ ...items[0], quantity: 3 }, items[1]], products, deals: { DEAL1: deal() }, bundles: [],
        })).toThrow(/quantity of 1/);
    });

    it('deal never costs more than the items', () => {
        const r = buildOrderPricing({
            items: [{ id: 'b', quantity: 1, dealId: 'DEAL1-1700000000000' }, { id: 's', quantity: 1, dealId: 'DEAL1-1700000000000' }],
            products: [product('b', 1, { multiCardTier: 'bronze' }), product('s', 2, { multiCardTier: 'silver' })],
            deals: { DEAL1: deal({ price: 20 }) }, bundles: [],
        });
        expect(r.pricing.subtotal).toBe(3);
    });

    it('enforces deal maxPerCustomer', () => {
        expect(() => buildOrderPricing({
            items: [{ id: 'b', quantity: 1, dealId: 'DEAL1-1700000000000' }, { id: 's', quantity: 1, dealId: 'DEAL1-1700000000000' }],
            products: [product('b', 4, { multiCardTier: 'bronze' }), product('s', 16, { multiCardTier: 'silver' })],
            deals: { DEAL1: deal({ maxPerCustomer: 1 }) }, bundles: [], dealAllowance: { DEAL1: 0 },
        })).toThrow(/limit/);
    });

    it('rejects negative / fractional quantities', () => {
        expect(() => buildOrderPricing({ items: [{ id: 'p', quantity: -5 }], products: [product('p', 10)], deals: {}, bundles: [] })).toThrow();
        expect(() => buildOrderPricing({ items: [{ id: 'p', quantity: 1.5 }], products: [product('p', 10)], deals: {}, bundles: [] })).toThrow();
    });

    it('applies fixed-price bundles from Firestore with per-customer allowance', () => {
        const b: FixedPriceBundle = { id: 'B', sellerId: 's1', name: '5 for $20', listingIds: [], category: 'Collector Cards', quantity: 5, price: 20, isActive: true, maxPerCustomer: 1 };
        const items = Array.from({ length: 10 }, (_, i) => ({ id: `c${i}`, quantity: 1 }));
        const products = items.map(i => product(i.id, 6));
        const r = buildOrderPricing({ items, products, deals: {}, bundles: [b], bundleAllowance: { B: 1 } });
        expect(r.pricing.subtotal).toBe(20 + 30);
        expect(r.bundleUsage).toEqual({ B: 1 });
    });

    it('stored tiers above 90% are capped server-side', () => {
        const r = buildOrderPricing({
            items: [{ id: 'p', quantity: 2 }],
            products: [product('p', 10, { multibuyEnabled: true, multibuyTiers: [{ minQuantity: 2, discountPercent: 100 }] })],
            deals: {}, bundles: [],
        });
        expect(r.pricing.subtotal).toBe(2);
    });

    it('parseDealId', () => {
        expect(parseDealId('abcXYZ-1712345678901')).toBe('abcXYZ');
        expect(parseDealId('abc')).toBe('abc');
    });
});
