'use server';

import { firestoreDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function submitPartnerInquiryAction(formData: any) {
    try {
        const inquiryRef = firestoreDb.collection('partner_inquiries').doc();
        await inquiryRef.set({
            id: inquiryRef.id,
            ...formData,
            status: 'new',
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        });

        return { success: true };
    } catch (error: any) {
        console.error('Error submitting partner inquiry:', error);
        return { success: false, error: error.message };
    }
}
