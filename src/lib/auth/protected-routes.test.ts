import { describe, it, expect } from 'vitest';
import { isSellerAreaProtected } from './protected-routes';

describe('isSellerAreaProtected', () => {
    it('keeps seller tools behind sign-in', () => {
        for (const p of ['/sell/create', '/sell/payouts', '/seller/dashboard', '/seller/dashboard/', '/seller/agreement', '/seller/bundles', '/seller/onboarding', '/seller/analytics', '/seller/price-check', '/seller']) {
            expect(isSellerAreaProtected(p)).toBe(true);
        }
    });
    it('leaves buyer-facing pages public', () => {
        for (const p of ['/sell', '/sell/', '/sellers', '/seller/abc123XYZ', '/seller/abc123XYZ/', '/shoes', '/cards/x/y']) {
            expect(isSellerAreaProtected(p)).toBe(false);
        }
    });
});
