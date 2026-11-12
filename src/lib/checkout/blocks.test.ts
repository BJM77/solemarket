import { describe, it, expect } from 'vitest';
import {
    BuyerBlockedError, SELLER_BLOCKED_MESSAGE, SITEWIDE_BLOCKED_MESSAGE, assertNotBlocked, cleanReason, findBlock,
    formatAuMobile, formatBuyerHistory, maskMobile, matchesBlock, mergeUids, mobileKey, multiSellerBlocks,
    sellerBlockId, smsHref, summariseBuyerHistory, telHref,
} from './blocks';

describe('mobile keys and formatting', () => {
    it('keys any AU mobile format to the same digits-only id', () => {
        for (const m of ['0412 345 678', '+61 412 345 678', '61412345678', '0061412345678', '(0412) 345-678']) {
            expect(mobileKey(m)).toBe('61412345678');
        }
        expect(mobileKey('08 9123 4567')).toBeNull();
        expect(mobileKey('')).toBeNull();
    });
    it('formats, masks and links', () => {
        expect(formatAuMobile('+61412345678')).toBe('0412 345 678');
        expect(maskMobile('0412345678')).toBe('0412 *** 678');
        expect(maskMobile('nope')).toBeNull();
        expect(telHref('0412 345 678')).toBe('tel:+61412345678');
        expect(smsHref('0412 345 678')).toBe('sms:+61412345678');
        expect(telHref('')).toBeNull();
    });
    it('seller block ids use the mobile, or the account for older orders', () => {
        expect(sellerBlockId('s1', { mobile: '0412 345 678', uid: 'u1' })).toBe('s1_61412345678');
        expect(sellerBlockId('s1', { uid: 'u1' })).toBe('s1_u-u1');
        expect(sellerBlockId('s1', {})).toBeNull();
        expect(sellerBlockId('../x', { uid: 'u1' })).toBeNull();
    });
    it('cleans reasons and merges uids', () => {
        expect(cleanReason("  didn't <b>pay</b>  ")).toBe("didn't b pay /b");
        expect(cleanReason('   ')).toBeNull();
        expect(cleanReason('x'.repeat(500))).toHaveLength(200);
        expect(mergeUids('a', ['b', 'a', null], undefined, ['bad/uid'])).toEqual(['a', 'b']);
    });
});

describe('block checks', () => {
    const sitewide = [{ mobile: '+61400000001', uids: ['bad-uid'] }];
    const seller = [{ sellerId: 'seller-a', mobile: '+61400000002', uids: ['u2'] }];

    it('matches by mobile (any format) or by an account seen with it', () => {
        expect(matchesBlock(sitewide[0], { mobile: '0400 000 001' })).toBe(true);
        expect(matchesBlock(sitewide[0], { uid: 'bad-uid' })).toBe(true);
        expect(matchesBlock(sitewide[0], { mobile: '0400 000 009', uid: 'other' })).toBe(false);
        expect(matchesBlock(null, { mobile: '0400 000 001' })).toBe(false);
    });
    it('sitewide blocks apply to every seller', () => {
        expect(findBlock({ sitewide, seller: [] }, { mobile: '+61400000001' }, ['anyone'])).toBe('sitewide');
        expect(findBlock({ sitewide, seller: [] }, { mobile: '+61400000001' }, [])).toBe('sitewide');
        expect(() => assertNotBlocked({ sitewide, seller: [] }, { uid: 'bad-uid', mobile: '0499 999 999' }, ['x'])).toThrow(SITEWIDE_BLOCKED_MESSAGE);
    });
    it('seller blocks only apply to that seller', () => {
        expect(findBlock({ sitewide: [], seller }, { mobile: '0400 000 002' }, ['seller-a'])).toBe('seller');
        expect(findBlock({ sitewide: [], seller }, { mobile: '0400 000 002' }, ['seller-b'])).toBeNull();
        expect(findBlock({ sitewide: [], seller }, { uid: 'u2' }, ['seller-b', 'seller-a'])).toBe('seller');
        expect(() => assertNotBlocked({ sitewide: [], seller }, { mobile: '0400 000 002' }, ['seller-a'])).toThrow(SELLER_BLOCKED_MESSAGE);
        expect(() => assertNotBlocked({ sitewide: [], seller }, { mobile: '0400 000 003' }, ['seller-a'])).not.toThrow();
    });
    it('sitewide wording wins when both apply, with a typed error', () => {
        try {
            assertNotBlocked({ sitewide: [{ mobile: '+61400000002' }], seller }, { mobile: '0400000002' }, ['seller-a']);
            throw new Error('should have thrown');
        } catch (e: any) {
            expect(e).toBeInstanceOf(BuyerBlockedError);
            expect(e.level).toBe('sitewide');
            expect(e.code).toBe('BUYER_BLOCKED');
        }
    });
});

describe('multi-seller blocks and buyer history', () => {
    it('lists numbers blocked by 2+ sellers that are not sitewide yet', () => {
        const r = multiSellerBlocks([
            { sellerId: 'a', mobile: '+61400000001', reason: 'no-show', createdAtMs: 1 },
            { sellerId: 'b', mobile: '0400 000 001', reason: 'no pay', createdAtMs: 5 },
            { sellerId: 'b', mobile: '+61400000001', createdAtMs: 2 },
            { sellerId: 'a', mobile: '+61400000002' },
            { sellerId: 'a', mobile: '+61400000003' }, { sellerId: 'b', mobile: '+61400000003' }, { sellerId: 'c', mobile: '+61400000003' },
            { sellerId: 'a', mobile: '+61400000004' }, { sellerId: 'b', mobile: '+61400000004' },
        ], ['+61400000004']);
        expect(r.map((x) => [x.mobile, x.sellerCount])).toEqual([['+61400000003', 3], ['+61400000001', 2]]);
        expect(r[1]).toMatchObject({ reasons: ['no-show', 'no pay'], lastBlockedAtMs: 5 });
    });
    it('counts outcomes only, leaving out the request being viewed', () => {
        const h = summariseBuyerHistory([
            { id: '1', status: 'completed' }, { id: '2', status: 'paid' },
            { id: '3', status: 'cancelled', cancelReason: 'seller_relisted', requestStatus: 'seller_relisted' },
            { id: '4', status: 'cancelled', cancelReason: 'cancelled_by_buyer' },
            { id: '5', status: 'expired' }, { id: '6', status: 'declined' }, { id: '7', status: 'requested' },
        ], '7');
        expect(h).toEqual({ completed: 2, relisted: 1, cancelled: 1, expired: 1, declined: 1, open: 0 });
        expect(formatBuyerHistory(h)).toBe('2 completed · 1 relisted by seller · 1 cancelled · 1 expired · 1 declined');
        expect(formatBuyerHistory(summariseBuyerHistory([]))).toBe('New buyer');
    });
});
