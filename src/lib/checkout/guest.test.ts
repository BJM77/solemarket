import { describe, it, expect } from 'vitest';
import { normalizeAuMobile, normalizeEmail, validateGuestDetails, checkFormTiming, isHoneypotFilled, msUntilFormReady, MIN_FORM_MS, MAX_FORM_MS } from './guest-validation';
import { generateOrderToken, identityHash, isPlausibleOrderToken, orderTokenHash } from './guest-crypto';

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

describe('anti-abuse (no email code)', () => {
    it('rejects forms submitted faster than a person could fill them', () => {
        const t0 = 1_000_000;
        expect(checkFormTiming(t0, t0 + 500)).toMatch(/quick/i);
        expect(checkFormTiming(t0, t0 + MIN_FORM_MS - 1)).toMatch(/quick/i);
        expect(checkFormTiming(t0, t0 + MIN_FORM_MS)).toBeNull();
        expect(checkFormTiming(t0, t0 + 60_000)).toBeNull();
    });
    it('rejects stale or missing form tickets', () => {
        const t0 = 1_000_000;
        expect(checkFormTiming(t0, t0 + MAX_FORM_MS + 1)).toMatch(/expired/i);
        expect(checkFormTiming(NaN, t0)).toMatch(/expired/i);
        expect(checkFormTiming(0, t0)).toMatch(/expired/i);
    });
    it('client waits out the minimum time instead of showing an error', () => {
        expect(msUntilFormReady(1000, 1000)).toBe(MIN_FORM_MS + 250);
        expect(msUntilFormReady(1000, 1000 + MIN_FORM_MS + 1000)).toBe(0);
    });
    it('honeypot: empty is a person, anything else is a bot', () => {
        expect(isHoneypotFilled(undefined)).toBe(false);
        expect(isHoneypotFilled(null)).toBe(false);
        expect(isHoneypotFilled('')).toBe(false);
        expect(isHoneypotFilled('   ')).toBe(false);
        expect(isHoneypotFilled('http://spam.example')).toBe(true);
    });
    it('email is collected but mobile must be Australian', () => {
        expect(() => validateGuestDetails({ name: 'Ben', email: 'b@x.com', mobile: '+1 415 555 0100' })).toThrow(/Australian mobile/);
        expect(() => validateGuestDetails({ name: 'Ben', email: 'not-an-email', mobile: '0412345678' })).toThrow(/email/);
    });
});

describe('tokens', () => {
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
