'use server';

import { firestoreDb } from '@/lib/firebase/admin';
import { UserProfile } from '@/lib/types';

export async function isSlugAvailable(slug: string, currentUserId?: string): Promise<boolean> {
    try {
        const querySnapshot = await firestoreDb.collection('users')
            .where('shopSlug', '==', slug)
            .limit(1)
            .get();

        if (querySnapshot.empty) return true;

        // If the owner is the requester, it's "available" to them
        if (currentUserId && querySnapshot.docs[0].id === currentUserId) return true;

        return false;
    } catch (error) {
        console.error('Error checking slug availability:', error);
        return false;
    }
}

export async function getSellerProfile(identifier: string): Promise<{ profile: UserProfile | null, error?: string }> {
    try {
        // 1. Try fetching by ID first
        let doc = await firestoreDb.collection('users').doc(identifier).get();

        // 2. If not found by ID, try fetching by shopSlug
        if (!doc.exists) {
            const slugQuery = await firestoreDb.collection('users')
                .where('shopSlug', '==', identifier)
                .limit(1)
                .get();

            if (!slugQuery.empty) {
                doc = slugQuery.docs[0];
            }
        }

        if (!doc.exists) {
            return { profile: null, error: 'Seller not found' };
        }

        const data = doc.data() as UserProfile;

        // Return only a subset of data for safety
        const safeProfile: UserProfile = {
            id: doc.id,
            displayName: data.displayName || 'Collector',
            email: data.email || '',
            storeName: data.storeName || data.displayName,
            storeDescription: data.storeDescription || '',
            bio: data.bio || '',
            photoURL: data.photoURL || '',
            bannerUrl: data.bannerUrl || '',
            shopSlug: data.shopSlug || '',
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
