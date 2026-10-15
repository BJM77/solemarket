import { describe, it, expect } from 'vitest';
import {
    normalizePayId, isValidAbn, validateSellerPayout, generatePaymentReference, paymentDueAt,
    assertCheckoutPaymentAllowed, nextOrderState, normalizePaymentMethod, maskPayId,
} from './local';

describe('PayID validation', () => {
    it('accepts email, AU mobile and ABN', () => {
        expect(normalizePayId(' Ben@Example.com ')).toEqual({ payId: 'ben@example.com', payIdType: 'email' });
        expect(normalizePayId('0412 345 678')).toEqual({ payId: '+61412345678', payIdType: 'phone' });
        expect(normalizePayId('+61412345678')?.payIdType).toBe('phone');
        expect(isValidAbn('51824753556')).toBe(true);
        expect(normalizePayId('51 824 753 556')).toEqual({ payId: '51824753556', payIdType: 'abn' });
    });
    it('rejects junk', () => {
        expect(normalizePayId('hello')).toBeNull();
        expect(normalizePayId('12345678901')).toBeNull();
        expect(() => validateSellerPayout({ payId: 'x', accountName: 'Ben' })).toThrow();
        expect(() => validateSellerPayout({ payId: 'a@b.co', accountName: '' })).toThrow();
        expect(validateSellerPayout({ payId: 'a@b.co', accountName: '  Ben   Mack ' }).accountName).toBe('Ben Mack');
    });
    it('masks', () => {
        expect(maskPayId('ben@example.com')).toBe('be***@example.com');
        expect(maskPayId('+61412345678')).toBe('+614***678');
    });
});

describe('references + expiry', () => {
    it('reference format', () => {
        expect(generatePaymentReference()).toMatch(/^BEN-[A-HJ-NP-Z2-9]{6}$/);
    });
    it('48h for PayID, 72h for cash', () => {
        const t = new Date('2026-01-01T00:00:00Z');
        expect(paymentDueAt('payid', t).toISOString()).toBe('2026-01-03T00:00:00.000Z');
        expect(paymentDueAt('cash', t).toISOString()).toBe('2026-01-04T00:00:00.000Z');
    });
    it('maps legacy method names', () => {
        expect(normalizePaymentMethod('EFT / PayID Escrow')).toBe('payid');
        expect(normalizePaymentMethod('Cash on Delivery')).toBe('cash');
        expect(normalizePaymentMethod('Card')).toBeNull();
    });
});

describe('checkout rules', () => {
    const ready = { sellerId: 's1', sellerName: 'Sam', payIdReady: true };
    const notReady = { sellerId: 's2', sellerName: 'Kim', payIdReady: false };
    it('PayID needs every seller to have a PayID', () => {
        expect(() => assertCheckoutPaymentAllowed({ method: 'payid', shippingMethod: 'shipping', sellers: [ready] })).not.toThrow();
        expect(() => assertCheckoutPaymentAllowed({ method: 'payid', shippingMethod: 'shipping', sellers: [ready, notReady] })).toThrow(/Kim/);
    });
    it('cash is Perth pickup only', () => {
        expect(() => assertCheckoutPaymentAllowed({ method: 'cash', shippingMethod: 'shipping', sellers: [notReady], perthPickupConfirmed: true })).toThrow(/pickup/);
        expect(() => assertCheckoutPaymentAllowed({ method: 'cash', shippingMethod: 'pickup', sellers: [notReady] })).toThrow(/Perth/);
        expect(() => assertCheckoutPaymentAllowed({ method: 'cash', shippingMethod: 'pickup', sellers: [notReady], perthPickupConfirmed: true })).not.toThrow();
    });
});

describe('order transitions', () => {
    it('mark paid', () => {
        expect(nextOrderState({ status: 'awaiting_payment', paymentMethod: 'payid' }, 'mark_paid')).toMatchObject({ status: 'paid', productStatus: 'sold' });
        expect(() => nextOrderState({ status: 'cancelled' }, 'mark_paid')).toThrow();
    });
    it('mark collected (cash pickup)', () => {
        expect(nextOrderState({ status: 'awaiting_payment', paymentMethod: 'cash', shippingMethod: 'pickup' }, 'mark_collected')).toMatchObject({ status: 'completed', paymentStatus: 'paid' });
        expect(() => nextOrderState({ status: 'paid', paymentMethod: 'payid', shippingMethod: 'shipping' }, 'mark_collected')).toThrow();
    });
    it('cancel releases stock', () => {
        expect(nextOrderState({ status: 'awaiting_payment' }, 'cancel').productStatus).toBe('available');
        expect(() => nextOrderState({ status: 'paid' }, 'cancel')).toThrow();
    });
});
