import { describe, it, expect } from 'vitest';
import { normalizeAuMobile, normalizeEmail, validateGuestDetails, isSixDigitCode } from './guest-validation';
import { codeMatches, generateCode, generateOrderToken, hashCode, identityHash, isPlausibleOrderToken, orderTokenHash } from './guest-crypto';

describe('guest details', () => {
    it('normalises AU mobiles', () => {
        expect(normalizeAuMobile('0412 345 678')).toBe('+61412345678');
        expect(normalizeAuMobile('+61 412 345 678')).toBe('+61412345678');
        expect(normalizeAuMobile('(08) 9123 4567')).toBeNull();
        expect(normalizeAuMobile('12345')).toBeNull();
    });
    it('normalises email', () => {
        expect(normalizeEmail(' Ben@Example.COM ')).toBe('ben@example.com');
        expect(normalizeEmail('nope')).toBeNull();
    });
    it('validates and requires an address for postage', () => {
        const ok = validateGuestDetails({ name: ' Ben  M ', email: 'b@x.com', mobile: '0412345678' });
        expect(ok).toEqual({ name: 'Ben M', email: 'b@x.com', mobile: '+61412345678', shippingMethod: 'pickup', shippingAddress: null });
        expect(() => validateGuestDetails({ name: 'B', email: 'b@x.com', mobile: '0412345678' })).toThrow(/name/);
        expect(() => validateGuestDetails({ name: 'Ben', email: 'b@x.com', mobile: '0412345678', shippingMethod: 'shipping', shippingAddress: { street: '1 A St', city: 'Perth', state: 'wa', zip: '60' } })).toThrow(/postcode/);
        const shipped = validateGuestDetails({ name: 'Ben', email: 'b@x.com', mobile: '0412345678', shippingMethod: 'shipping', shippingAddress: { street: '1 A St', city: 'Perth', state: 'wa', zip: '6000' } });
        expect(shipped.shippingAddress).toEqual({ street: '1 A St', city: 'Perth', state: 'WA', zip: '6000' });
    });
    it('strips markup from names', () => {
        expect(validateGuestDetails({ name: '<b>Ben</b>', email: 'b@x.com', mobile: '0412345678' }).name).toBe('bBen/b');
    });
});

describe('codes and tokens', () => {
    it('6-digit codes, salted by challenge id, constant-time compare', () => {
        for (let i = 0; i < 50; i++) expect(isSixDigitCode(generateCode())).toBe(true);
        const h = hashCode('challenge-1', '123456');
        expect(codeMatches('challenge-1', '123456', h)).toBe(true);
        expect(codeMatches('challenge-1', '123457', h)).toBe(false);
        expect(codeMatches('challenge-2', '123456', h)).toBe(false);
        expect(codeMatches('challenge-1', '123456', 'zz')).toBe(false);
    });
    it('order tokens are long, random and only stored hashed', () => {
        const a = generateOrderToken();
        const b = generateOrderToken();
        expect(a.token).not.toBe(b.token);
        expect(isPlausibleOrderToken(a.token)).toBe(true);
        expect(a.hash).toBe(orderTokenHash(a.token));
        expect(a.hash).not.toContain(a.token);
        expect(isPlausibleOrderToken('short')).toBe(false);
        expect(isPlausibleOrderToken('../../etc/passwd-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')).toBe(false);
    });
    it('identity hashes are stable and kind-scoped', () => {
        expect(identityHash('email', 'A@b.com ')).toBe(identityHash('email', 'a@b.com'));
        expect(identityHash('email', 'x')).not.toBe(identityHash('phone', 'x'));
    });
});
