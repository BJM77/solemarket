'use server';

import { db } from '@/lib/firebase/config';
import { doc, setDoc, getDoc } from 'firebase/firestore';

const SETTINGS_DOC_ID = 'auto_repricing_settings';

interface AutoRepricingSettings {
    viewThreshold: number;
    priceDropPercentage: number;
    waitingPeriodHours: number;
}

export async function saveAutoRepricingSettings(settings: AutoRepricingSettings) {
    try {
        const settingsRef = doc(db, 'settings', SETTINGS_DOC_ID);
        await setDoc(settingsRef, settings, { merge: true });
        return { success: true, message: 'Auto-repricing settings saved successfully.' };
    } catch (error) {
        console.error('Error saving auto-repricing settings:', error);
        return { success: false, message: 'Failed to save auto-repricing settings.' };
    }
}

export async function getAutoRepricingSettings(): Promise<AutoRepricingSettings | null> {
    try {
        const settingsRef = doc(db, 'settings', SETTINGS_DOC_ID);
        const docSnap = await getDoc(settingsRef);
        if (docSnap.exists()) {
            return docSnap.data() as AutoRepricingSettings;
        }
        return null;
    } catch (error) {
        console.error('Error fetching auto-repricing settings:', error);
        return null;
    }
}
