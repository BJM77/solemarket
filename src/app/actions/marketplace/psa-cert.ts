'use server';

import { firestoreDb } from '@/lib/firebase/admin';
import { ensureActionAuth } from '@/lib/action-utils';
import { checkRateLimit } from '@/lib/rate-limit-guard';
import { FieldValue } from 'firebase-admin/firestore';

export interface PsaCertDetails {
    certNumber: string;
    verified: boolean;
    year?: string;
    brand?: string;
    category?: string;
    cardNumber?: string;
    subject?: string;
    variety?: string;
    gradeDescription?: string;
    cardGrade?: string;
    totalPopulation?: number;
    populationHigher?: number;
    checkedAt: string;
    cached?: boolean;
}

/**
 * Reads an already-cached PSA cert result from Firestore (`psa_certs/{certNumber}`)
 * without consuming any PSA API quota. Safe for any visitor.
 */
export async function getCachedPsaCertAction(certNumberInput: string): Promise<{ success: true; data: PsaCertDetails | null }> {
    const cleanCert = String(certNumberInput || '').replace(/\D/g, '').trim();
    if (!cleanCert || cleanCert.length < 5 || cleanCert.length > 12) {
        return { success: true, data: null };
    }

    try {
        const cachedSnap = await firestoreDb.collection('psa_certs').doc(cleanCert).get();
        if (cachedSnap.exists) {
            const cachedData = cachedSnap.data() as PsaCertDetails;
            return { success: true, data: { ...cachedData, cached: true } };
        }
    } catch (e) {
        console.warn('PSA cache read error:', e);
    }

    return { success: true, data: null };
}

/**
 * Looks up a PSA certification number and caches the result permanently in Firestore (`psa_certs/{certNumber}`)
 * so PSA's API daily quota is conserved and each cert is only looked up once.
 * Uncached live lookups are restricted to the listing owner or an admin.
 * Never embeds or stores PSA scan images.
 */
export async function verifyPsaCertAction(
    certNumberInput: string,
    opts?: { idToken?: string; productId?: string }
): Promise<{ success: true; data: PsaCertDetails } | { success: false; error: string }> {
    const cleanCert = String(certNumberInput || '').replace(/\D/g, '').trim();
    if (!cleanCert || cleanCert.length < 5 || cleanCert.length > 12) {
        return { success: false, error: 'Enter a valid PSA certification number.' };
    }

    const docRef = firestoreDb.collection('psa_certs').doc(cleanCert);

    try {
        const cachedSnap = await docRef.get();
        if (cachedSnap.exists) {
            const cachedData = cachedSnap.data() as PsaCertDetails;
            return { success: true, data: { ...cachedData, cached: true } };
        }
    } catch (e) {
        console.warn('PSA cache read error:', e);
    }

    if (!opts?.idToken) {
        return {
            success: false,
            error: 'Only the listing owner or an admin can request a live PSA lookup.',
        };
    }

    let uid: string;
    let role: string;
    try {
        const auth = await ensureActionAuth(opts.idToken);
        uid = auth.uid;
        role = auth.role;
    } catch {
        return {
            success: false,
            error: 'Sign in as the listing owner or an admin to verify this cert.',
        };
    }

    const isAdmin = role === 'admin' || role === 'superadmin';
    if (!isAdmin) {
        if (!opts.productId) {
            return {
                success: false,
                error: 'Only the listing owner or an admin can request a live PSA lookup.',
            };
        }
        const prodSnap = await firestoreDb.collection('products').doc(opts.productId).get();
        const prodData = prodSnap.data();
        if (!prodSnap.exists || prodData?.sellerId !== uid) {
            return {
                success: false,
                error: 'Only the listing owner or an admin can request a live PSA lookup.',
            };
        }
    }

    if (!(await checkRateLimit('psa-cert-lookup', { limit: 15, windowSeconds: 3600, identifier: uid }))) {
        return { success: false, error: 'Too many PSA lookup requests. Try again later.' };
    }

    const token = process.env.PSA_API_TOKEN;
    if (!token) {
        return {
            success: false,
            error: 'PSA API token not configured yet. Use the official PSA link to verify.',
        };
    }

    try {
        const res = await fetch(`https://api.psacard.com/publicapi/cert/GetByCertNumber/${cleanCert}`, {
            headers: {
                Authorization: `bearer ${token}`,
                Accept: 'application/json',
            },
        });

        if (!res.ok) {
            return { success: false, error: `PSA lookup returned ${res.status}.` };
        }

        const json = await res.json();
        const cert = json?.PSACert;
        if (!cert || !cert.CertNumber) {
            return { success: false, error: 'Cert number not found in PSA database.' };
        }

        const record: PsaCertDetails = {
            certNumber: String(cert.CertNumber),
            verified: true,
            year: cert.Year || undefined,
            brand: cert.Brand || undefined,
            category: cert.Category || undefined,
            cardNumber: cert.CardNumber || undefined,
            subject: cert.Subject || undefined,
            variety: cert.Variety || undefined,
            gradeDescription: cert.GradeDescription || undefined,
            cardGrade: cert.CardGrade || undefined,
            totalPopulation: typeof cert.TotalPopulation === 'number' ? cert.TotalPopulation : undefined,
            populationHigher: typeof cert.PopulationHigher === 'number' ? cert.PopulationHigher : undefined,
            checkedAt: new Date().toISOString(),
        };

        try {
            await docRef.set({
                ...record,
                updatedAt: FieldValue.serverTimestamp(),
            });
        } catch (e) {
            console.warn('PSA cache write failed:', e);
        }

        return { success: true, data: record };
    } catch (e: any) {
        return { success: false, error: e?.message || 'Failed to contact PSA API.' };
    }
}
