'use server';

import { getAuthenticatedUser } from '@/lib/firebase/auth-admin';
import { admin } from '@/lib/firebase/admin';
import { revalidatePath } from 'next/cache';

export async function submitSellerApplication(formData: FormData) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) {
            return { error: 'Unauthorized' };
        }

        const listingQuantity = Number(formData.get('listingQuantity'));
        const valueRange = formData.get('valueRange') as string;
        const tradingHistory = formData.get('tradingHistory') as string;

        if (!listingQuantity || !valueRange || !tradingHistory) {
            return { error: 'Please answer all questions.' };
        }

        const isBusiness = listingQuantity > 50;
        const newRole = isBusiness ? 'business' : 'seller';
        const newAccountType = isBusiness ? 'seller' : 'seller'; // Keep accountType as seller, but role distinguishes business logic usually.
        // Wait, types.ts says UserProfile['accountType'] is 'buyer' | 'seller'.
        // And 'role' is 'viewer' | 'seller' | 'business' | 'admin'.

        // Update user profile in Firestore
        const userRef = admin.firestore().collection('users').doc(user.uid);

        // Get current user to check if they are already higher role?
        const userSnap = await userRef.get();
        const userData = userSnap.data();

        let roleToSet = newRole;
        if (userData?.role === 'admin' || userData?.role === 'superadmin') {
            roleToSet = userData.role; // Don't downgrade admins
        }

        await userRef.update({
            role: roleToSet,
            accountType: 'seller', // Ensure they are marked as a seller
            canSell: true,
            sellerApplication: {
                listingQuantity,
                valueRange,
                tradingHistory,
                appliedAt: admin.firestore.FieldValue.serverTimestamp(),
                autoUpgradedToBusiness: isBusiness
            },
            sellerStatus: 'approved', // Auto-approve for now based on requirements, unless manual verification is needed?
            // Requirement: "Automatically convert sellers to 'Business' accounts if they indicate they will list over 50 items."
            // It implies immediate conversion.
            listingLimit: isBusiness ? 1000 : 50 // Set listing limit based on role? Or logic elsewhere.
        });

        // Update Auth Custom Claims if needed (Role)
        await admin.auth().setCustomUserClaims(user.uid, {
            ...(user.customClaims || {}),
            role: roleToSet,
            canSell: true
        });

        revalidatePath('/sell/dashboard');
        revalidatePath('/profile');

        return { success: true, isBusiness };
    } catch (error: any) {
        console.error('Error submitting application:', error);
        return { error: error.message || 'Failed to submit application.' };
    }
}
