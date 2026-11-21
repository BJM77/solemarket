import { describe, it, expect } from 'vitest';
import { decideReprice } from './decide';

const H = 3_600_000;
const NOW = Date.parse('2026-11-21T00:00:00Z');
const settings = { viewThreshold: 10, priceDropPercentage: 10, waitingPeriodHours: 48 };
const listing = (extra: any = {}) => ({
    autoRepricingEnabled: true, status: 'available', uniqueViews: 50, price: 100,
    lastViewedTimestamp: NOW - 72 * H, ...extra,
});

describe('decideReprice', () => {
    it('drops the price once the waiting period has passed', () => {
        expect(decideReprice(listing(), settings, NOW)).toEqual({ newPrice: 90, originalPrice: 100, floor: 50 });
    });

    it('does not drop again within the waiting period after a reprice', () => {
        expect(decideReprice(listing({ price: 90, originalPrice: 100, lastRepricedAt: NOW - 2 * H }), settings, NOW)).toBeNull();
        expect(decideReprice(listing({ price: 90, originalPrice: 100, lastRepricedAt: NOW - 49 * H }), settings, NOW)?.newPrice).toBe(81);
    });

    it('never goes below half the original price', () => {
        expect(decideReprice(listing({ price: 52, originalPrice: 100 }), settings, NOW)?.newPrice).toBe(50);
        expect(decideReprice(listing({ price: 50, originalPrice: 100 }), settings, NOW)).toBeNull();
        expect(decideReprice(listing({ price: 40, originalPrice: 100 }), settings, NOW)).toBeNull();
    });

    it('repeated runs converge on the floor instead of $1', () => {
        let p: any = listing();
        let t = NOW;
        for (let i = 0; i < 50; i++) {
            const d = decideReprice(p, settings, t);
            if (d) p = { ...p, price: d.newPrice, originalPrice: d.originalPrice, lastRepricedAt: t };
            t += 49 * H;
            p.lastViewedTimestamp = t - 49 * H;
        }
        expect(p.price).toBe(50);
    });

    it('skips listings that are not for sale, recently viewed, or below the view threshold', () => {
        expect(decideReprice(listing({ status: 'sold' }), settings, NOW)).toBeNull();
        expect(decideReprice(listing({ isDraft: true }), settings, NOW)).toBeNull();
        expect(decideReprice(listing({ lastViewedTimestamp: NOW - H }), settings, NOW)).toBeNull();
        expect(decideReprice(listing({ uniqueViews: 3 }), settings, NOW)).toBeNull();
        expect(decideReprice(listing({ autoRepricingEnabled: false }), settings, NOW)).toBeNull();
        expect(decideReprice(listing({ lastViewedTimestamp: undefined }), settings, NOW)).toBeNull();
    });
});
