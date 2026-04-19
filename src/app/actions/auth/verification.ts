'use server';

import { firestoreDb, admin as firebaseAdmin } from '@/lib/firebase/admin';
import { verifyIdToken } from '@/lib/firebase/auth-admin';
import { VerificationRequest } from '@/lib/types';
import { revalidatePath } from 'next/cache';

/**
 * Submit a verification request.
 * Creates a document in 'verification_requests' and updates the user profile status.
 */
export async function submitVerificationRequest(idToken: string, documentUrls: string[], userMessage: string) {
    try {
        const decodedToken = await verifyIdToken(idToken);
        const { uid: userId, name, email } = decodedToken;

        if (documentUrls.length === 0) {
            return { success: false, error: 'At least one document is required.' };
        }

        const requestData: Omit<VerificationRequest, 'id'> = {
            userId,
            userName: name || email || 'Unknown',
            type: 'user', // Currently only handling user verification
            status: 'pending',
            documentUrls,
            userMessage: userMessage || '',
            createdAt: firebaseAdmin.firestore.Timestamp.now() as any
        };

        const batch = firestoreDb.batch();

        // 1. Create Request
        const requestRef = firestoreDb.collection('verification_requests').doc(); // Auto-ID
        batch.set(requestRef, requestData);

        // 2. Update User Profile
        const userRef = firestoreDb.collection('users').doc(userId);
        batch.update(userRef, {
            verificationStatus: 'pending',
            updatedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp()
        });

        await batch.commit();

        return { success: true, message: 'Verification request submitted.' };

    } catch (error: any) {
        console.error('Submit verification error:', error);
        return { success: false, error: error.message || 'Failed to submit verification.' };
    }
}

/**
 * Approve a verification request (Admin only).
 */
export async function approveVerificationRequest(idToken: string, requestId: string) {
    try {
        const decodedToken = await verifyIdToken(idToken);
        if (decodedToken.role !== 'admin' && decodedToken.role !== 'superadmin') {
            return { success: false, error: 'Unauthorized' };
        }

        const requestRef = firestoreDb.collection('verification_requests').doc(requestId);
        const requestSnap = await requestRef.get();

        if (!requestSnap.exists) {
            return { success: false, error: 'Request not found.' };
        }

        const request = requestSnap.data() as VerificationRequest;
        const targetUserId = request.userId;

        const batch = firestoreDb.batch();

        // 1. Update Request
        batch.update(requestRef, {
            status: 'approved',
            reviewedBy: decodedToken.uid,
            reviewedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp()
        });

        // 2. Update User Profile
        const userRef = firestoreDb.collection('users').doc(targetUserId);
        batch.update(userRef, {
            isVerified: true,
            verificationStatus: 'approved',
            updatedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp()
        });

        await batch.commit();

        revalidatePath('/admin/verifications');
        return { success: true, message: 'User verified successfully.' };

    } catch (error: any) {
        console.error('Approve verification error:', error);
        return { success: false, error: error.message || 'Failed to approve.' };
    }
}

/**
 * Reject a verification request (Admin only).
 */
export async function rejectVerificationRequest(idToken: string, requestId: string, reason: string) {
    try {
        const decodedToken = await verifyIdToken(idToken);
        if (decodedToken.role !== 'admin' && decodedToken.role !== 'superadmin') {
            return { success: false, error: 'Unauthorized' };
        }

        const requestRef = firestoreDb.collection('verification_requests').doc(requestId);
        const requestSnap = await requestRef.get();

        if (!requestSnap.exists) {
            return { success: false, error: 'Request not found.' };
        }

        const request = requestSnap.data() as VerificationRequest;
        const targetUserId = request.userId;

        const batch = firestoreDb.batch();

        // 1. Update Request
        batch.update(requestRef, {
            status: 'rejected',
            rejectionReason: reason,
            reviewedBy: decodedToken.uid,
            reviewedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp()
        });

        // 2. Update User Profile
        const userRef = firestoreDb.collection('users').doc(targetUserId);
        batch.update(userRef, {
            isVerified: false,
            verificationStatus: 'rejected',
            updatedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp()
        });

        await batch.commit();

        revalidatePath('/admin/verifications');
        return { success: true, message: 'Request rejected.' };

    } catch (error: any) {
        console.error('Reject verification error:', error);
        return { success: false, error: error.message || 'Failed to reject.' };
    }
}

/**
 * Get all pending verification requests (Admin).
 */
export async function getPendingVerificationRequests(idToken: string) {
    try {
        const decodedToken = await verifyIdToken(idToken);
        if (decodedToken.role !== 'admin' && decodedToken.role !== 'superadmin') {
            return { error: 'Unauthorized' };
        }

        const snapshot = await firestoreDb.collection('verification_requests')
            .where('status', '==', 'pending')
            .orderBy('createdAt', 'desc')
            .get();

        const requests = snapshot.docs.map((doc: any) => ({
            id: doc.id,
            ...doc.data(),
            createdAt: (doc.data().createdAt as any).toDate().toISOString() // Serialize
        } as unknown as VerificationRequest));

        return { requests };

    } catch (error: any) {
        console.error('Get requests error:', error);
        return { error: error.message };
    }
}
