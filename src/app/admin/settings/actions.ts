'use server';

import { db } from '@/lib/firebase/config';
import { doc, setDoc, getDoc } from 'firebase/firestore';

const SETTINGS_DOC_ID = 'system_settings';

export interface SystemSettings {
    freightCharge: number;
    freeShippingThreshold: number;
    standardTaxRate?: number;
}

export async function saveSystemSettings(settings: SystemSettings) {
    try {
        const settingsRef = doc(db, 'settings', SETTINGS_DOC_ID);
        await setDoc(settingsRef, settings, { merge: true });
        return { success: true, message: 'Settings updated successfully.' };
    } catch (error) {
        console.error('Error saving system settings:', error);
        return { success: false, message: 'Failed to update settings.' };
    }
}

export async function getSystemSettings(): Promise<SystemSettings> {
    try {
        const settingsRef = doc(db, 'settings', SETTINGS_DOC_ID);
        const docSnap = await getDoc(settingsRef);

        if (docSnap.exists()) {
            return docSnap.data() as SystemSettings;
        }

        // Return defaults if not found
        return {
            freightCharge: 12.00,
            freeShippingThreshold: 150.00,
            standardTaxRate: 0.10,
        };
    } catch (error) {
        console.error('Error fetching system settings:', error);
        return {
            freightCharge: 12.00,
            freeShippingThreshold: 150.00,
            standardTaxRate: 0.10,
        };
    }
}
