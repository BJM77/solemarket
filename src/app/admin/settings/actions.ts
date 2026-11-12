'use server';

import { firestoreDb as db } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { verifyIdToken } from '@/lib/firebase/auth-admin';

const SETTINGS_DOC_ID = 'system_settings';

export interface AdminSystemSettings {
    freightCharge: number;
    freeShippingThreshold: number;
    standardTaxRate?: number;
}

export async function saveSystemSettings(settings: AdminSystemSettings, idToken: string) {
    try {
        if (!idToken) {
            return { success: false, message: 'Authentication required.' };
        }

        const decodedToken = await verifyIdToken(idToken);
        const userSnap = await db.collection('users').doc(decodedToken.uid).get();
        const role = userSnap.data()?.role || (decodedToken as { role?: string }).role;

        if (role !== 'admin' && role !== 'superadmin') {
            return { success: false, message: 'Unauthorized: Admin access required.' };
        }

        const settingsRef = db.collection('settings').doc(SETTINGS_DOC_ID);
        await settingsRef.set({
            freightCharge: settings.freightCharge,
            freeShippingThreshold: settings.freeShippingThreshold,
            standardTaxRate: settings.standardTaxRate,
            updatedAt: FieldValue.serverTimestamp()
        }, { merge: true });

        return { success: true, message: 'Settings updated successfully.' };
    } catch (error: any) {
        console.error('Error saving system settings:', error);
        return { success: false, message: error.message || 'Failed to update settings.' };
    }
}

export async function getSystemSettings(): Promise<AdminSystemSettings> {
    const defaults: AdminSystemSettings = {
        freightCharge: 12.00,
        freeShippingThreshold: 150.00,
        standardTaxRate: 0.10,
    };

    try {
        const settingsRef = db.collection('settings').doc(SETTINGS_DOC_ID);
        const docSnap = await settingsRef.get();

        if (docSnap.exists) {
            const data = docSnap.data();
            return {
                freightCharge: data?.freightCharge ?? defaults.freightCharge,
                freeShippingThreshold: data?.freeShippingThreshold ?? defaults.freeShippingThreshold,
                standardTaxRate: data?.standardTaxRate ?? defaults.standardTaxRate,
            };
        }

        return defaults;
    } catch (error) {
        console.error('Error fetching system settings:', error);
        return defaults;
    }
}
