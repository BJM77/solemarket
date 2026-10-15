import { describe, it, expect } from 'vitest';
import { summarize, removeOutliers, percentBelowMarket, classifyListing, priceWarning, titleSimilarity, cacheKey, parseCardNumber, toAud, keywords } from './stats';
import type { Comp } from './types';

const c = (price: number, kind: Comp['kind'] = 'sold'): Comp => ({ source: 'benched', kind, title: 't', price });

describe('price stats', () => {
    it('removes outliers', () => {
        expect(removeOutliers([10, 11, 12, 13, 14, 500])).not.toContain(500);
        expect(removeOutliers([1, 1000])).toEqual([1, 1000]);
    });
    it('summarises a range', () => {
        const s = summarize([10, 12, 14, 16, 18, 20].map(p => c(p)));
        expect(s).toMatchObject({ low: 12.5, median: 15, high: 17.5, sampleSize: 6, confidence: 'medium' });
    });
    it('uses active listings only when there are few sold comps, discounted 10%', () => {
        const s = summarize([c(100, 'active'), c(100, 'active'), c(100, 'active')]);
        expect(s.median).toBe(90);
        const strong = summarize([c(50), c(50), c(50), c(500, 'active')]);
        expect(strong.median).toBe(50);
    });
    it('no data', () => {
        expect(summarize([])).toMatchObject({ median: null, confidence: 'none' });
    });
    it('below / above market', () => {
        expect(percentBelowMarket(70, 100)).toBe(30);
        expect(classifyListing(70, { median: 100, confidence: 'medium' })).toEqual({ flag: 'below_market', pct: 30 });
        expect(classifyListing(150, { median: 100, confidence: 'low' }).flag).toBe('above_market');
        expect(classifyListing(95, { median: 100, confidence: 'low' }).flag).toBe('ok');
        expect(classifyListing(95, { median: null, confidence: 'none' }).flag).toBe('unknown');
        expect(priceWarning(70, { median: 100, confidence: 'medium' })).toMatch(/30% below market/);
    });
    it('text helpers', () => {
        expect(titleSimilarity('Charizard Base Set 4/102', 'PSA 9 Charizard 4/102 Base Set Holo')).toBe(1);
        expect(keywords('Pokemon Charizard PSA 10')).toEqual(['charizard', '10']);
        expect(cacheKey({ query: 'Charizard base' })).toBe(cacheKey({ query: 'base  CHARIZARD' }));
        expect(parseCardNumber('Charizard 4/102 Base')).toBe('4');
        expect(parseCardNumber('Pikachu #58')).toBe('58');
        expect(parseCardNumber('Jordan 1 size 10')).toBeNull();
        expect(toAud(10, 'USD')).toBeCloseTo(15.2);
        expect(toAud(10, 'XYZ')).toBeNull();
    });
});
