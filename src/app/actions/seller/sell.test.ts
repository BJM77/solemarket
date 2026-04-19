import { describe, it, expect, vi, beforeEach } from 'vitest';
import { saveDraftListing, publishListing } from './sell';
import { firestoreDb as db, auth as adminAuth } from '@/lib/firebase/admin';

vi.mock('@/lib/firebase/admin', () => ({
  firestoreDb: {
    collection: vi.fn(() => ({
      doc: vi.fn(),
      add: vi.fn(),
      where: vi.fn().mockReturnThis(),
      get: vi.fn(),
    })),
  },
  auth: {
    getUser: vi.fn(),
  },
}));

vi.mock('firebase-admin/firestore', () => ({
  FieldValue: {
    serverTimestamp: vi.fn(() => 'mock-timestamp'),
  },
}));

describe('Seller Actions', () => {
    const userId = 'user-1';
    const mockData = {
        title: 'Test Sneaker',
        price: 100,
        category: 'Sneakers',
        condition: 'New',
        quantity: 1,
        isReverseBidding: false,
        autoRepricingEnabled: false,
        isVault: false,
        imageUrls: ['img1.jpg'],
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('saveDraftListing', () => {
        it('should create a new draft listing if no draftId provided', async () => {
            const mockAdd = vi.fn().mockResolvedValue({ id: 'new-draft-id' });
            (db.collection as any).mockReturnValue({ add: mockAdd });
            (adminAuth.getUser as any).mockResolvedValue({ customClaims: { role: 'seller' } });

            const result = await saveDraftListing(userId, mockData);

            expect(result).toBe('new-draft-id');
            expect(mockAdd).toHaveBeenCalledWith(expect.objectContaining({
                title: 'Test Sneaker',
                status: 'draft',
                sellerId: userId,
            }));
        });

        it('should update existing draft and verify ownership', async () => {
            const mockDoc = {
                get: vi.fn().mockResolvedValue({
                    exists: true,
                    data: () => ({ sellerId: userId })
                }),
                set: vi.fn().mockResolvedValue({}),
            };
            (db.collection as any).mockReturnValue({ doc: vi.fn().mockReturnValue(mockDoc) });
            (adminAuth.getUser as any).mockResolvedValue({ customClaims: { role: 'seller' } });

            const result = await saveDraftListing(userId, mockData, 'existing-id');

            expect(result).toBe('existing-id');
            expect(mockDoc.set).toHaveBeenCalledWith(expect.objectContaining({
                title: 'Test Sneaker',
                status: 'draft'
            }), { merge: true });
        });

        it('should throw error if unauthorized user tries to update draft', async () => {
            const mockDoc = {
                get: vi.fn().mockResolvedValue({
                    exists: true,
                    data: () => ({ sellerId: 'different-user' })
                }),
            };
            (db.collection as any).mockReturnValue({ doc: vi.fn().mockReturnValue(mockDoc) });
            (adminAuth.getUser as any).mockResolvedValue({ customClaims: { role: 'seller' } });

            await expect(saveDraftListing(userId, mockData, 'existing-id'))
                .rejects.toThrow("Unauthorized: You do not own this listing.");
        });
    });

    // publishListing tests could go here...
});
