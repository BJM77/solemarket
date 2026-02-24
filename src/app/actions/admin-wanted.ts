'use server';

import { firestoreDb } from '@/lib/firebase/admin';
import { verifyIdToken } from '@/lib/firebase/auth-admin';
import { serializeFirestoreData } from '@/lib/utils';
import { FieldValue } from 'firebase-admin/firestore';

export interface AdminWantedCriterion {
    id: string;
    keywords: string[];
    category: string;
    active: boolean;
    createdAt: string;
    notes?: string;
}

export async function getAdminWantedCriteria(idToken: string) {
    try {
        const decodedToken = await verifyIdToken(idToken);
        if (decodedToken.role !== 'superadmin') {
            throw new Error('Unauthorized: Super Admin only.');
        }

        const snapshot = await firestoreDb.collection('admin_wanted_criteria')
            .orderBy('createdAt', 'desc')
            .get();

        const criteria = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        return {
            success: true,
            criteria: criteria.map((c: any) => serializeFirestoreData({
                ...c,
                createdAt: c.createdAt?.toDate?.().toISOString() || new Date().toISOString(),
            }))
        };
    } catch (error: any) {
        console.error('Error fetching admin wanted criteria:', error);
        return { success: false, error: error.message };
    }
}

export async function addAdminWantedCriterion(idToken: string, keywords: string[], category: string, notes?: string) {
    try {
        const decodedToken = await verifyIdToken(idToken);
        if (decodedToken.role !== 'superadmin') {
            throw new Error('Unauthorized: Super Admin only.');
        }

        const docRef = await firestoreDb.collection('admin_wanted_criteria').add({
            keywords: keywords.map(k => k.toLowerCase().trim()),
            category,
            notes: notes || '',
            active: true,
            createdAt: FieldValue.serverTimestamp(),
        });

        return { success: true, id: docRef.id };
    } catch (error: any) {
        console.error('Error adding admin wanted criterion:', error);
        return { success: false, error: error.message };
    }
}

export async function deleteAdminWantedCriterion(idToken: string, id: string) {
    try {
        const decodedToken = await verifyIdToken(idToken);
        if (decodedToken.role !== 'superadmin') {
            throw new Error('Unauthorized: Super Admin only.');
        }

        await firestoreDb.collection('admin_wanted_criteria').doc(id).delete();
        return { success: true };
    } catch (error: any) {
        console.error('Error deleting admin wanted criterion:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Checks a product title and category against all active admin wanted criteria.
 * Internal server-side function.
 */
export async function checkForAdminWantedMatch(title: string, category: string): Promise<boolean> {
    try {
        const snapshot = await firestoreDb.collection('admin_wanted_criteria')
            .where('active', '==', true)
            .get();

        if (snapshot.empty) return false;

        const titleLower = title.toLowerCase();

        for (const doc of snapshot.docs) {
            const data = doc.data();
            
            // If category matches (or is 'All')
            if (data.category === 'All' || data.category === category) {
                // Check if any keyword is in the title
                const hasMatch = data.keywords.some((kw: string) => titleLower.includes(kw.toLowerCase()));
                if (hasMatch) return true;
            }
        }

        return false;
    } catch (error) {
        console.error('Error checking for admin wanted match:', error);
        return false;
    }
}
