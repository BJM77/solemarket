'use server';

import { firestoreDb } from '@/lib/firebase/admin';
import { ensureActionAuth } from '@/lib/action-utils';
import { runAutoRepricing } from '@/ai/flows/auto-repricing';

const SETTINGS_DOC_ID = 'auto_repricing_settings';

export interface AutoRepricingSettings {
    viewThreshold: number;
    priceDropPercentage: number;
    waitingPeriodHours: number;
}

export async function saveAutoRepricingSettings(idToken: string, settings: AutoRepricingSettings) {
    try {
        await ensureActionAuth(idToken, ['admin', 'superadmin']);

        if (
            typeof settings.viewThreshold !== 'number' ||
            typeof settings.priceDropPercentage !== 'number' ||
            typeof settings.waitingPeriodHours !== 'number' ||
            settings.viewThreshold < 1 ||
            settings.priceDropPercentage < 1 ||
            settings.priceDropPercentage > 100 ||
            settings.waitingPeriodHours < 0
        ) {
            return { success: false, message: 'Invalid settings values provided.' };
        }

        const settingsRef = firestoreDb.collection('settings').doc(SETTINGS_DOC_ID);
        await settingsRef.set(
            {
                ...settings,
                updatedAt: new Date(),
            },
            { merge: true }
        );

        return { success: true, message: 'Auto-repricing settings saved successfully.' };
    } catch (error: any) {
        console.error('Error saving auto-repricing settings:', error);
        return { success: false, message: error?.message || 'Failed to save auto-repricing settings.' };
    }
}

export async function getAutoRepricingSettings(): Promise<AutoRepricingSettings | null> {
    try {
        const settingsRef = firestoreDb.collection('settings').doc(SETTINGS_DOC_ID);
        const docSnap = await settingsRef.get();
        if (docSnap.exists) {
            const data = docSnap.data();
            return {
                viewThreshold: Number(data?.viewThreshold ?? 100),
                priceDropPercentage: Number(data?.priceDropPercentage ?? 3),
                waitingPeriodHours: Number(data?.waitingPeriodHours ?? 48),
            };
        }
        return null;
    } catch (error) {
        console.error('Error fetching auto-repricing settings:', error);
        return null;
    }
}

export async function triggerAutoRepricingNow(idToken: string) {
    try {
        await ensureActionAuth(idToken, ['admin', 'superadmin']);
        const result = await runAutoRepricing();
        return result;
    } catch (error: any) {
        console.error('Error running auto-repricing on demand:', error);
        return { success: false, message: error?.message || 'Failed to run auto-repricing.', repricedProducts: [] };
    }
}
