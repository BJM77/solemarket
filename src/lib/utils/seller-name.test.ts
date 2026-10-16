import { describe, it, expect } from 'vitest';
import { resolveSellerName, isPlaceholderSellerName } from './seller-name';

describe('resolveSellerName', () => {
    it('prefers store name over display name', () => {
        expect(resolveSellerName({ storeName: 'Kicks WA', displayName: 'Ben' })).toBe('Kicks WA');
    });
    it('skips placeholders and emails', () => {
        expect(resolveSellerName({ displayName: 'Admin' }, 'Unknown Seller', 'Ben M')).toBe('Ben M');
        expect(resolveSellerName({ displayName: 'a@b.com' })).toBe('Private Seller');
        expect(isPlaceholderSellerName('Benched Member')).toBe(true);
    });
});
