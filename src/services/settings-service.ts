import { firestoreDb as db } from '@/lib/firebase/admin';

const SETTINGS_DOC_ID = 'system_settings';

export interface SystemSettings {
    freightCharge: number;
    freeShippingThreshold: number;
    standardTaxRate: number;
}

const DEFAULT_SETTINGS: SystemSettings = {
    freightCharge: 12.00,
    freeShippingThreshold: 150.00,
    standardTaxRate: 0.10,
};

/**
 * Fetch system settings from Firestore using Admin SDK.
 */
export async function getSystemSettingsAdmin(): Promise<SystemSettings> {
    try {
        const docRef = db.collection('settings').doc(SETTINGS_DOC_ID);
        const docSnap = await docRef.get();

        if (docSnap.exists) {
            const data = docSnap.data() as SystemSettings;
            return {
                freightCharge: data.freightCharge ?? DEFAULT_SETTINGS.freightCharge,
                freeShippingThreshold: data.freeShippingThreshold ?? DEFAULT_SETTINGS.freeShippingThreshold,
                standardTaxRate: data.standardTaxRate ?? DEFAULT_SETTINGS.standardTaxRate,
            };
        }

        return DEFAULT_SETTINGS;
    } catch (error) {
        console.error('Error fetching system settings (Admin):', error);
        return DEFAULT_SETTINGS;
    }
}
