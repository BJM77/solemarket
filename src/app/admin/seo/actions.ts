'use server';

import { db } from '@/lib/firebase/config';
import { doc, setDoc, getDoc } from 'firebase/firestore';

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
        const settingsRef = doc(db, 'settings', SEO_SETTINGS_DOC_ID);
        await setDoc(settingsRef, settings, { merge: true });
        return { success: true, message: 'SEO settings updated successfully.' };
    } catch (error) {
        console.error('Error saving SEO settings:', error);
        return { success: false, message: 'Failed to update SEO settings.' };
    }
}

export async function getSEOSettings(): Promise<SEOSettings> {
    try {
        const settingsRef = doc(db, 'settings', SEO_SETTINGS_DOC_ID);
        const docSnap = await getDoc(settingsRef);

        if (docSnap.exists()) {
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
