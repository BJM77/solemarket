'use server';

import { firestoreDb } from '@/lib/firebase/admin';
import { getUserIdFromSession } from './seller-actions'; // Reuse this robust token decrypter

export async function completeUserProfile(data: {
    accountType: 'buyer' | 'seller';
    storeName?: string;
    storeDescription?: string;
    acceptsStripe?: boolean;
    acceptsCOD?: boolean;
    acceptsPayID?: boolean;
}) {
    try {
        const uid = await getUserIdFromSession();
        if (!uid) {
            return { success: false, error: 'Unauthorized. Please sign in again.' };
        }

        const userRef = firestoreDb.collection('users').doc(uid);
        const userSnap = await userRef.get();

        if (!userSnap.exists) {
            return { success: false, error: 'User profile not found.' };
        }

        const updateData: any = {
            accountType: data.accountType,
            agreedToTerms: true,
        };

        if (data.accountType === 'seller') {
            updateData.storeName = data.storeName || '';
            updateData.storeDescription = data.storeDescription || '';
            updateData.acceptsStripe = data.acceptsStripe ?? false;
            updateData.acceptsCOD = data.acceptsCOD ?? false;
            updateData.acceptsPayID = data.acceptsPayID ?? false;
        }

        await userRef.set(updateData, { merge: true });

        return { success: true };
    } catch (error: any) {
        console.error('Error completing user profile:', error);
        return { success: false, error: error.message || 'Failed to complete profile.' };
    }
}
