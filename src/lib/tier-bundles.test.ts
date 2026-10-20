import { describe, it, expect } from 'vitest';
import { priceCart, type PricingLine } from './bundles';
import { buildOrderPricing } from './order-pricing';
import {
    DEFAULT_TIER_SETTINGS, normalizeTierSettings, priceTierPool, tierGroupFor, tierNudge, validateTierSettings,
} from './tier-bundles';
import type { Product } from '@/lib/types';

const T = DEFAULT_TIER_SETTINGS;
const line = (id: string, price: number, o: Partial<PricingLine> = {}): PricingLine => ({
    id, sellerId: 's1', category: 'Collector Cards', unitPrice: price, quantity: 1, bundleTier: 'bronze', ...o,
});
const cards = (n: number, price: number, o: Partial<PricingLine> = {}) =>
    Array.from({ length: n }, (_, i) => line(`c${i}`, price, o));

describe('tier groups', () => {
    it('maps categories', () => {
        expect(tierGroupFor('Collector Cards')).toBe('cards');
        expect(tierGroupFor('Coins')).toBe('coins');
        expect(tierGroupFor('Sneakers')).toBeNull();
        expect(tierGroupFor(undefined)).toBeNull();
    });
});

describe('priceTierPool', () => {
    it('bundles 5 x $6 into $20', () => {
        const r = priceTierPool([6, 6, 6, 6, 6].map((c, i) => ({ line: i, cents: c * 100 })), { quantity: 5, price: 20 });
        expect(r.sets).toBe(1);
        expect(r.assigned.reduce((a, x) => a + x.cents, 0)).toBe(2000);
    });
    it('picks the most expensive items so the buyer pays least; leftovers stay full price', () => {
        const prices = [10, 1, 8, 2, 9, 7, 6];
        const r = priceTierPool(prices.map((p, i) => ({ line: i, cents: p * 100 })), { quantity: 5, price: 20 });
        expect(r.sets).toBe(1);
        expect(new Set(r.assigned.map(a => a.line))).toEqual(new Set([0, 2, 4, 5, 6]));
        expect(r.originalCents).toBe(4000);
    });
    it('never applies a bundle that costs more than buying individually', () => {
        const r = priceTierPool([1, 1, 1, 1, 1].map((p, i) => ({ line: i, cents: p * 100 })), { quantity: 5, price: 20 });
        expect(r.sets).toBe(0);
    });
    it('stops at the first set that would not save money', () => {
        const prices = [10, 10, 10, 10, 10, 2, 2, 2, 2, 2];
        const r = priceTierPool(prices.map((p, i) => ({ line: i, cents: p * 100 })), { quantity: 5, price: 20 });
        expect(r.sets).toBe(1);
    });
});

describe('priceCart with tiers', () => {
    it('does nothing without tier settings', () => {
        const r = priceCart(cards(5, 6));
        expect(r.subtotal).toBe(30);
        expect(r.tierNudges).toEqual([]);
    });
    it('applies 5 for $20 and reports savings', () => {
        const r = priceCart(cards(5, 6), [], { tierSettings: T });
        expect(r.subtotal).toBe(20);
        expect(r.savings).toBe(10);
        expect(r.tierBundles[0]).toMatchObject({ tier: 'bronze', group: 'cards', sets: 1, price: 20, originalValue: 30 });
        expect(r.lines.every(l => l.tierUnits === 1)).toBe(true);
    });
    it('a $10 card can be in Bronze', () => {
        const r = priceCart([...cards(4, 5), line('big', 10)], [], { tierSettings: T });
        expect(r.subtotal).toBe(20);
    });
    it('counts line quantity as units and applies multiple sets', () => {
        const r = priceCart([line('a', 6, { quantity: 11 })], [], { tierSettings: T });
        expect(r.subtotal).toBe(46); // 2 x $20 + 1 x $6
        expect(r.tierNudges[0].remaining).toBe(4);
    });
    it('does not mix cards and coins', () => {
        const r = priceCart([...cards(3, 6), line('k1', 6, { category: 'Coins' }), line('k2', 6, { category: 'Coins' })], [], { tierSettings: T });
        expect(r.subtotal).toBe(30);
        expect(r.tierNudges.map(n => n.group).sort()).toEqual(['cards', 'coins']);
    });
    it('does not mix tiers', () => {
        const r = priceCart([...cards(3, 10), line('g1', 10, { bundleTier: 'gold' }), line('g2', 10, { bundleTier: 'gold' })], [], { tierSettings: T });
        expect(r.subtotal).toBe(50);
    });
    it('only counts items from the same seller', () => {
        const r = priceCart([...cards(3, 6), line('x1', 6, { sellerId: 's2' }), line('x2', 6, { sellerId: 's2' })], [], { tierSettings: T });
        expect(r.subtotal).toBe(30);
        expect(r.tierNudges).toHaveLength(2);
    });
    it('ignores non-card/coin categories and platinum', () => {
        const r = priceCart([...cards(5, 6, { category: 'Sneakers' })], [], { tierSettings: T });
        expect(r.subtotal).toBe(30);
        const p = priceCart([...cards(5, 6, { bundleTier: 'platinum' })], [], { tierSettings: T });
        expect(p.subtotal).toBe(30);
    });
    it('respects disabled settings and custom coin values', () => {
        expect(priceCart(cards(5, 6), [], { tierSettings: { ...T, enabled: false } }).subtotal).toBe(30);
        const s = { ...T, coins: { ...T.coins, silver: { quantity: 3, price: 25 } } };
        const r = priceCart(cards(3, 10, { category: 'Coins', bundleTier: 'silver' }), [], { tierSettings: s });
        expect(r.subtotal).toBe(25);
    });
    it('deal-priced lines are excluded', () => {
        const r = priceCart([...cards(4, 6), line('d', 6, { fixedTotal: 3 })], [], { tierSettings: T });
        expect(r.subtotal).toBe(27);
    });
});

describe('nudges', () => {
    it('says how many more to add', () => {
        const n = tierNudge('s1', 'cards', 'bronze', 3, { quantity: 5, price: 20 }, 0);
        expect(n.remaining).toBe(2);
        expect(n.message).toBe('Add 2 more Bronze cards to get 5 for only $20');
        expect(tierNudge('s1', 'coins', 'gold', 4, { quantity: 5, price: 60 }, 0).message).toBe('Add 1 more Gold coin to get 5 for only $60');
    });
    it('confirms when applied', () => {
        expect(tierNudge('s1', 'cards', 'silver', 10, { quantity: 5, price: 40 }, 2).message).toBe('Silver cards: 5 for only $40 applied x2');
    });
});

describe('settings validation', () => {
    it('accepts defaults and rejects out-of-range quantities', () => {
        expect(validateTierSettings(T)).toEqual(T);
        expect(() => validateTierSettings({ ...T, cards: { ...T.cards, gold: { quantity: 21, price: 60 } } })).toThrow(/between 2 and 20/);
        expect(() => validateTierSettings({ ...T, coins: { ...T.coins, bronze: { quantity: 5, price: 0 } } })).toThrow(/price/);
    });
    it('normalise falls back to defaults for junk', () => {
        const n = normalizeTierSettings({ cards: { bronze: { quantity: 1, price: 'x' }, silver: { quantity: 10, price: 35 } } });
        expect(n.cards.bronze).toEqual({ quantity: 5, price: 20 });
        expect(n.cards.silver).toEqual({ quantity: 10, price: 35 });
        expect(n.enabled).toBe(true);
    });
});

describe('server order pricing uses product tier, not client', () => {
    const product = (id: string, price: number, o: Record<string, any> = {}): Product => ({
        id, title: id, price, sellerId: 's1', category: 'Collector Cards', status: 'available', quantity: 5, multiCardTier: 'bronze', ...o,
    } as any);
    it('recomputes the bundle price', () => {
        const products = Array.from({ length: 5 }, (_, i) => product(`p${i}`, 6));
        const r = buildOrderPricing({ items: products.map(p => ({ id: p.id, quantity: 1, bundlePrice: 0.01 })), products, deals: {}, bundles: [], tierSettings: T });
        expect(r.lineTotals.reduce((a, b) => a + b, 0)).toBeCloseTo(20, 2);
    });
    it('untiered products pay full price', () => {
        const products = Array.from({ length: 5 }, (_, i) => product(`p${i}`, 6, { multiCardTier: undefined }));
        const r = buildOrderPricing({ items: products.map(p => ({ id: p.id, quantity: 1 })), products, deals: {}, bundles: [], tierSettings: T });
        expect(r.lineTotals.reduce((a, b) => a + b, 0)).toBeCloseTo(30, 2);
    });
});
