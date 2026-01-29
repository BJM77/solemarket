
'use server';

import { firestoreDb, admin } from '@/lib/firebase/admin';
import { verifyIdToken } from '@/lib/firebase/auth-admin';
import { revalidatePath } from 'next/cache';

export type EnquiryType = 'dealsafe' | 'general' | 'support';

export interface EnquiryData {
    name: string;
    email: string;
    message: string;
    type: EnquiryType;
    phoneNumber?: string;
    subject?: string;
    userId?: string;
}

export async function submitEnquiry(data: EnquiryData) {
    try {
        const enquiryRef = await firestoreDb.collection('enquiries').add({
            ...data,
            status: 'new',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        revalidatePath('/admin/enquiries');

        return { success: true, message: 'Your enquiry has been sent successfully. An expert will be in touch shortly.', id: enquiryRef.id };
    } catch (error: any) {
        console.error('Error submitting enquiry:', error);
        return { success: false, message: error.message || 'Failed to send enquiry. Please try again later.' };
    }
}

export async function getEnquiries(idToken: string) {
    try {
        const decodedToken = await verifyIdToken(idToken);
        const isSuperAdmin = decodedToken.role === 'superadmin';

        if (!isSuperAdmin) {
            return { error: 'Access denied. Super Admin only.' };
        }

        const snapshot = await firestoreDb.collection('enquiries')
            .orderBy('createdAt', 'desc')
            .get();

        const enquiries = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString()
            };
        });

        return { enquiries };
    } catch (error: any) {
        console.error('Error fetching enquiries:', error);
        return { error: error.message || 'Failed to fetch enquiries.' };
    }
}

export async function updateEnquiryStatus(idToken: string, enquiryId: string, status: string) {
    try {
        const decodedToken = await verifyIdToken(idToken);
        const isSuperAdmin = decodedToken.role === 'superadmin';

        if (!isSuperAdmin) {
            return { error: 'Access denied.' };
        }

        await firestoreDb.collection('enquiries').doc(enquiryId).update({
            status,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        revalidatePath('/admin/enquiries');
        return { success: true };
    } catch (error: any) {
        return { error: error.message };
    }
}
