'use server';

import { firestoreDb } from '@/lib/firebase/admin';
import { getCurrentUser } from '@/lib/firebase/auth-admin'; // Optional: if we want to add auth check later


const SEO_SETTINGS_DOC_ID = 'seo_settings';

export interface SEOSettings {
    siteTitleTemplate: string;
    defaultDescription: string;
    keywords: string;
    allowIndexing: boolean;
    australiaOnly: boolean;
    localBusinessSchema: {
        name: string;
        addressCountry: string;
        addressRegion: string;
        addressLocality: string;
        postalCode: string;
        phone: string;
    };
    socialLinks: {
        facebook: string;
        instagram: string;
        twitter: string;
    };
}

export async function saveSEOSettings(settings: SEOSettings) {
    try {
        await firestoreDb.collection('settings').doc(SEO_SETTINGS_DOC_ID).set(settings, { merge: true });
        return { success: true, message: 'SEO settings updated successfully.' };
    } catch (error: any) {
        console.error('Error saving SEO settings:', error);
        return { success: false, message: `Failed to update SEO settings: ${error.message}` };
    }
}

export async function getSEOSettings(): Promise<SEOSettings> {
    try {
        const docSnap = await firestoreDb.collection('settings').doc(SEO_SETTINGS_DOC_ID).get();

        if (docSnap.exists) {
            return docSnap.data() as SEOSettings;
        }

        return {
            siteTitleTemplate: '%s | Picksy - Australia\'s Local Marketplace',
            defaultDescription: 'The premier Australian marketplace for grading, buying, and selling collector cards, coins, and memorabilia.',
            keywords: 'trading cards australia, sports cards perth, coin collecting australia, psa grading australia',
            allowIndexing: true,
            australiaOnly: true,
            localBusinessSchema: {
                name: 'Picksy',
                addressCountry: 'Australia',
                addressRegion: 'Western Australia',
                addressLocality: 'Perth',
                postalCode: '6000',
                phone: '',
            },
            socialLinks: {
                facebook: '',
                instagram: '',
                twitter: '',
            }
        };
    } catch (error) {
        console.error('Error fetching SEO settings:', error);
        return {
            siteTitleTemplate: '%s | Picksy',
            defaultDescription: '',
            keywords: '',
            allowIndexing: true,
            australiaOnly: true,
            localBusinessSchema: {
                name: 'Picksy',
                addressCountry: 'Australia',
                addressRegion: '',
                addressLocality: '',
                postalCode: '',
                phone: '',
            },
            socialLinks: {
                facebook: '',
                instagram: '',
                twitter: '',
            }
        };
    }
}
