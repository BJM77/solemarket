import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSetupIntentAction } from './payments';
import { verifyIdToken } from '@/lib/firebase/auth-admin';
import { firestoreDb } from '@/lib/firebase/admin';
import { getStripe } from '@/lib/stripe/server';

vi.mock('@/lib/firebase/auth-admin');
vi.mock('@/lib/stripe/server');

describe('Payments Actions', () => {
    const mockIdToken = 'valid-token';
    const mockUser = { uid: 'user-123', email: 'user@example.com' };
    const mockStripe = {
        customers: { create: vi.fn() },
        setupIntents: { create: vi.fn() },
    };

    beforeEach(() => {
        vi.clearAllMocks();
        (verifyIdToken as any).mockResolvedValue(mockUser);
        (getStripe as any).mockReturnValue(mockStripe);
    });

    it('should create a setup intent for a new customer', async () => {
        // 1. Setup mocks
        const mockDoc = {
            get: vi.fn().mockResolvedValue({ data: () => ({}), exists: true }),
            update: vi.fn().mockResolvedValue({}),
        };
        (firestoreDb.collection as any).mockReturnValue({
            doc: vi.fn().mockReturnValue(mockDoc),
        });

        mockStripe.customers.create.mockResolvedValue({ id: 'cus_123' });
        mockStripe.setupIntents.create.mockResolvedValue({ client_secret: 'secret_123' });

        // 2. Execute
        const result = await createSetupIntentAction(mockIdToken);

        // 3. Assert
        expect(result.success).toBe(true);
        expect(result.clientSecret).toBe('secret_123');
        expect(mockStripe.customers.create).toHaveBeenCalled();
        expect(mockDoc.update).toHaveBeenCalledWith({ stripeCustomerId: 'cus_123' });
    });

    it('should reuse an existing customer if available', async () => {
        // 1. Setup mocks (existing customer)
        const mockDoc = {
            get: vi.fn().mockResolvedValue({ 
                data: () => ({ stripeCustomerId: 'cus_already_exists' }), 
                exists: true 
            }),
            update: vi.fn(),
        };
        (firestoreDb.collection as any).mockReturnValue({
            doc: vi.fn().mockReturnValue(mockDoc),
        });

        mockStripe.setupIntents.create.mockResolvedValue({ client_secret: 'secret_456' });

        // 2. Execute
        const result = await createSetupIntentAction(mockIdToken);

        // 3. Assert
        expect(result.success).toBe(true);
        expect(mockStripe.customers.create).not.toHaveBeenCalled();
        expect(mockStripe.setupIntents.create).toHaveBeenCalledWith({
            customer: 'cus_already_exists',
            payment_method_types: ['card']
        });
    });

    it('should return error if token verification fails', async () => {
        (verifyIdToken as any).mockRejectedValue(new Error('Invalid Token'));
        const result = await createSetupIntentAction('bad-token');
        expect(result.success).toBe(false);
        expect(result.message).toBe('Invalid Token');
    });
});
