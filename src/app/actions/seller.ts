'use server';

import { firestoreDb } from '@/lib/firebase/admin';
import { UserProfile } from '@/lib/types';

export async function getSellerProfile(sellerId: string): Promise<{ profile: UserProfile | null, error?: string }> {
    try {
        const doc = await firestoreDb.collection('users').doc(sellerId).get();

        if (!doc.exists) {
            return { profile: null, error: 'Seller not found' };
        }

        const data = doc.data() as UserProfile;

        // Return only a subset of data for safety (avoid exposing private fields if any)
        const safeProfile: UserProfile = {
            id: doc.id,
            displayName: data.displayName || 'Collector',
            email: data.email || '', // Should probably be masked or omitted if not needed
            storeName: data.storeName || data.displayName,
            storeDescription: data.storeDescription || '',
            bio: data.bio || '',
            photoURL: data.photoURL || '',
            bannerUrl: data.bannerUrl || '',
            isVerified: data.isVerified || false,
            isFounder: data.isFounder || false,
            rating: data.rating || 5,
            totalSales: data.totalSales || 0,
            joinDate: data.joinDate || '2024',
            role: data.role || 'seller'
        };

        return { profile: safeProfile };
    } catch (error: any) {
        console.error('Error fetching seller profile:', error);
        return { profile: null, error: error.message };
    }
}
