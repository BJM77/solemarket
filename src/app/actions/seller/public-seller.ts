'use server';

import { firestoreDb } from '@/lib/firebase/admin';
import type { UserProfile } from '@/lib/types';

/**
 * Public, display-safe seller info for product and seller pages.
 * Read with the Admin SDK so signed-out visitors never touch the private users/{uid}
 * doc from the browser. Never returns email, PayID, address or other private fields.
 */
export async function getPublicSellerInfo(sellerId: string): Promise<UserProfile | null> {
    if (!sellerId || typeof sellerId !== 'string' || sellerId.includes('/') || sellerId.length > 128) return null;
    try {
        const snap = await firestoreDb.collection('users').doc(sellerId).get();
        if (!snap.exists) return null;
        const d = snap.data() || {};
        const isSeller = d.accountType === 'seller' || ['seller', 'admin', 'superadmin'].includes(d.role) || d.canSell === true;
        const profile: Record<string, unknown> = {
            id: snap.id,
            displayName: d.displayName || '',
            storeName: d.storeName || '',
            businessName: d.businessName || '',
            photoURL: d.photoURL || '',
            shopSlug: d.shopSlug || '',
            isVerified: d.isVerified === true,
            rating: typeof d.rating === 'number' ? d.rating : undefined,
            totalSales: typeof d.totalSales === 'number' ? d.totalSales : 0,
            payIdReady: d.payIdReady === true,
        };
        if (isSeller) {
            Object.assign(profile, {
                bio: d.bio || '',
                storeDescription: d.storeDescription || '',
                bannerUrl: d.bannerUrl || '',
                phoneNumber: d.phoneNumber || '',
                createdAt: d.createdAt?.toDate ? d.createdAt.toDate().toISOString() : (typeof d.createdAt === 'string' ? d.createdAt : null),
            });
        }
        return profile as unknown as UserProfile;
    } catch (error) {
        console.error('getPublicSellerInfo failed:', error);
        return null;
    }
}
