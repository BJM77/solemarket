'use server';

import { firestoreDb as db } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { verifyIdToken } from '@/lib/firebase/auth-admin';

const SETTINGS_DOC_ID = 'system_settings';

export interface SystemSettings {
    freightCharge: number;
    freeShippingThreshold: number;
    standardTaxRate?: number;
    homepageCategoryMode?: 'manual' | 'popular' | 'default';
}


export async function saveSystemSettings(settings: SystemSettings, idToken?: string) {
    try {
        if (idToken) {
            const decodedToken = await verifyIdToken(idToken);
            const userRef = db.collection('users').doc(decodedToken.uid);
            const userSnap = await userRef.get();
            const userData = userSnap.data();

            if (userData?.role !== 'superadmin') {
                throw new Error('Unauthorized: Super Admin access required.');
            }
        }

        const settingsRef = db.collection('settings').doc(SETTINGS_DOC_ID);
        await settingsRef.set({
            ...settings,
            updatedAt: FieldValue.serverTimestamp()
        }, { merge: true });

        return { success: true, message: 'Settings updated successfully.' };
    } catch (error: any) {
        console.error('Error saving system settings:', error);
        return { success: false, message: error.message || 'Failed to update settings.' };
    }
}

export async function getSystemSettings(): Promise<SystemSettings> {
    try {
        const settingsRef = db.collection('settings').doc(SETTINGS_DOC_ID);
        const docSnap = await settingsRef.get();

        if (docSnap.exists) {
            return docSnap.data() as SystemSettings;
        }

        // Return defaults if not found
        return {
            freightCharge: 12.00,
            freeShippingThreshold: 150.00,
            standardTaxRate: 0.10,
            homepageCategoryMode: 'default'
        };

    } catch (error) {
        console.error('Error fetching system settings:', error);
        return {
            freightCharge: 12.00,
            freeShippingThreshold: 150.00,
            standardTaxRate: 0.10,
            homepageCategoryMode: 'default'
        };
    }
}
