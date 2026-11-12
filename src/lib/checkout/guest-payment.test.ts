import { describe, it, expect } from 'vitest';
import { guestRequestPaymentMethod, planAcceptPayment } from './requests';

describe('guest request payment method (guests never need to sign in)', () => {
    it('uses PayID when the seller has one', () => {
        expect(guestRequestPaymentMethod(true, 'pickup')).toBe('payid');
        expect(guestRequestPaymentMethod(true, 'shipping')).toBe('payid');
    });
    it('seller without PayID: cash for a Perth pickup', () => {
        expect(guestRequestPaymentMethod(false, 'pickup')).toBe('cash');
    });
    it('seller without PayID: posted orders still go through as PayID (seller adds it before accepting)', () => {
        expect(guestRequestPaymentMethod(false, 'shipping')).toBe('payid');
    });
});

describe('planAcceptPayment', () => {
    it('keeps cash orders and PayID orders that already have the PayID copied', () => {
        expect(planAcceptPayment({ paymentMethod: 'cash', shippingMethod: 'pickup' }, false, false)).toBe('keep');
        expect(planAcceptPayment({ paymentMethod: 'payid', shippingMethod: 'shipping' }, true, false)).toBe('keep');
    });
    it('copies the PayID the seller has added since the request', () => {
        expect(planAcceptPayment({ paymentMethod: 'payid', shippingMethod: 'shipping' }, false, true)).toBe('snapshot');
    });
    it('falls back to cash for a pickup when there is still no PayID', () => {
        expect(planAcceptPayment({ paymentMethod: 'payid', shippingMethod: 'pickup' }, false, false)).toBe('cash');
    });
    it('asks the seller to add a PayID for a posted order', () => {
        expect(planAcceptPayment({ paymentMethod: 'payid', shippingMethod: 'shipping' }, false, false)).toBe('needs_payid');
    });
});
