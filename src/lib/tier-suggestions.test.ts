import { describe, expect, it } from 'vitest';
import {
    dealFillHref,
    dealFillLinkLabel,
    isDealSuggestionEligible,
    selectDealSuggestions,
    suggestionCount,
    type SuggestionCandidate,
} from './tier-suggestions';

function card(overrides: Partial<SuggestionCandidate> & { id: string }): SuggestionCandidate {
    return {
        sellerId: 'seller-a',
        status: 'available',
        category: 'Collector Cards',
        multiCardTier: 'bronze',
        multibuyEnabled: true,
        price: 8,
        quantity: 1,
        ...overrides,
    };
}

describe('suggestionCount', () => {
    it('is remaining plus three spares, capped at 8', () => {
        expect(suggestionCount(0)).toBe(0);
        expect(suggestionCount(-1)).toBe(0);
        expect(suggestionCount(1)).toBe(4);
        expect(suggestionCount(4)).toBe(7);
        expect(suggestionCount(5)).toBe(8);
        expect(suggestionCount(20)).toBe(8);
    });
});

describe('dealFillHref and label', () => {
    it('builds a seller- and group-filtered /multibuy link', () => {
        expect(dealFillHref({
            tier: 'bronze',
            sellerId: 'abc',
            group: 'cards',
            sellerName: 'Jake',
        })).toBe('/multibuy?tier=bronze&seller=abc&group=cards&sellerName=Jake');
        expect(dealFillLinkLabel('bronze', 'cards', 'Jake')).toBe('See more Bronze cards from Jake');
        expect(dealFillLinkLabel('gold', 'coins')).toBe('See more Gold coins from this seller');
    });
});

describe('selectDealSuggestions', () => {
    const now = 1_700_000_000_000;

    it('keeps available same-seller, same-tier, same-group listings not already in the cart', () => {
        const listings = [
            card({ id: 'in-cart' }),
            card({ id: 'ok-1', createdAt: now - 1000 }),
            card({ id: 'ok-2', createdAt: now - 500 }),
            card({ id: 'gold', multiCardTier: 'gold' }),
            card({ id: 'other-seller', sellerId: 'seller-b' }),
            card({ id: 'coin', category: 'Coins' }),
            card({ id: 'sold', status: 'sold' }),
            card({ id: 'own', sellerId: 'buyer-1' }),
            card({ id: 'free', price: 0 }),
            card({ id: 'disabled', multibuyEnabled: false }),
        ];
        const picked = selectDealSuggestions(listings, {
            sellerId: 'seller-a',
            tier: 'bronze',
            group: 'cards',
            remaining: 2,
            excludeIds: ['in-cart'],
            buyerId: 'buyer-1',
            now,
        });
        expect(picked.map((p) => p.id)).toEqual(['ok-2', 'ok-1']);
    });

    it('caps the row at remaining + 3, and at 8', () => {
        const listings = Array.from({ length: 12 }, (_, i) => card({
            id: `c-${String(i).padStart(2, '0')}`,
            createdAt: now - i * 1000,
        }));
        expect(selectDealSuggestions(listings, {
            sellerId: 'seller-a', tier: 'bronze', group: 'cards', remaining: 1, now,
        })).toHaveLength(4);
        expect(selectDealSuggestions(listings, {
            sellerId: 'seller-a', tier: 'bronze', group: 'cards', remaining: 10, now,
        })).toHaveLength(8);
        expect(selectDealSuggestions(listings, {
            sellerId: 'seller-a', tier: 'bronze', group: 'cards', remaining: 0, now,
        })).toHaveLength(0);
    });

    it('skips listings held by someone else, but not the buyer\'s own cart hold', () => {
        const heldByOther = card({
            id: 'held',
            checkoutHolds: [{ orderId: 'cart:other', qty: 1, expiresAtMs: now + 60_000 }],
        });
        const heldByBuyer = card({
            id: 'mine-hold',
            checkoutHolds: [{ orderId: 'cart:buyer-1', qty: 1, expiresAtMs: now + 60_000 }],
        });
        const expired = card({
            id: 'expired',
            checkoutHolds: [{ orderId: 'cart:other', qty: 1, expiresAtMs: now - 1 }],
        });
        expect(isDealSuggestionEligible(heldByOther, {
            sellerId: 'seller-a', tier: 'bronze', group: 'cards', buyerId: 'buyer-1', now,
        })).toBe(false);
        expect(isDealSuggestionEligible(heldByBuyer, {
            sellerId: 'seller-a', tier: 'bronze', group: 'cards', buyerId: 'buyer-1', now,
        })).toBe(true);
        expect(isDealSuggestionEligible(expired, {
            sellerId: 'seller-a', tier: 'bronze', group: 'cards', buyerId: 'buyer-1', now,
        })).toBe(true);
    });
});
