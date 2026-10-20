import { describe, it, expect } from 'vitest';
import { pickPublicSellerFields } from './public-seller';

describe('pickPublicSellerFields', () => {
    it('drops private fields', () => {
        const out = pickPublicSellerFields({
            displayName: 'Ben', email: 'a@b.c', phoneNumber: '0400', payId: 'x', address: '1 St', photoURL: 'p',
        });
        expect(out).toEqual({ displayName: 'Ben', photoURL: 'p' });
    });
});
