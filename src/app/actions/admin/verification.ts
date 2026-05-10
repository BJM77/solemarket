'use server';

import { firestoreDb, admin } from '@/lib/firebase/admin';
import { ensureActionAuth } from '@/lib/action-utils';
import { FieldValue } from 'firebase-admin/firestore';

export interface VerificationPassport {
    id: string;
    productId: string;
    productTitle: string;
    productImage: string;
    verifierId: string;
    verifierName: string;
    verifiedAt: admin.firestore.Timestamp;
    status: 'authentic' | 'counterfeit' | 'inconclusive';
    notes: string;
    certificateId: string;
    qrCodeUrl?: string; // Optional: for physical labels
}

/**
 * Issues a digital authenticity passport for a product.
 * Restricted to admins or authorized verifiers.
 */
export async function issueVerificationPassport(idToken: string, data: {
    productId: string;
    status: 'authentic' | 'counterfeit' | 'inconclusive';
    notes: string;
}) {
    try {
        const { uid: adminId, name: adminName } = await ensureActionAuth(idToken, ['admin', 'superadmin']);

        // 1. Fetch Product
        const productRef = firestoreDb.collection('products').doc(data.productId);
        const productSnap = await productRef.get();
        if (!productSnap.exists) throw new Error("Product not found");
        const product = productSnap.data();

        // 2. Generate Certificate ID (Unique, searchable)
        const certificateId = `BCH-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

        const passportData: Omit<VerificationPassport, 'id'> = {
            productId: data.productId,
            productTitle: product?.title || 'Unknown Item',
            productImage: product?.imageUrls?.[0] || '',
            verifierId: adminId,
            verifierName: adminName || 'Benched Official',
            verifiedAt: admin.firestore.Timestamp.now(),
            status: data.status,
            notes: data.notes,
            certificateId,
        };

        // 3. Store Passport
        const passportRef = firestoreDb.collection('item_passports').doc();
        await passportRef.set(passportData);

        // 4. Update Product with verification link
        await productRef.update({
            sellerVerified: data.status === 'authentic',
            verificationPassportId: passportRef.id,
            verificationStatus: data.status,
            verifiedAt: FieldValue.serverTimestamp(),
        });

        return { 
            success: true, 
            passportId: passportRef.id, 
            certificateId,
            message: `Verification passport issued successfully: ${certificateId}` 
        };

    } catch (error: any) {
        console.error("Failed to issue verification passport:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Fetches a passport by ID or Certificate ID.
 */
export async function getPassport(idOrCert: string) {
    try {
        // Try by ID first
        let passportSnap = await firestoreDb.collection('item_passports').doc(idOrCert).get();
        
        if (!passportSnap.exists) {
            // Try by Certificate ID
            const certQuery = await firestoreDb.collection('item_passports')
                .where('certificateId', '==', idOrCert)
                .limit(1)
                .get();
            
            if (certQuery.empty) return null;
            passportSnap = certQuery.docs[0];
        }

        const data = passportSnap.data();
        return {
            id: passportSnap.id,
            ...data,
            verifiedAt: data?.verifiedAt?.toDate().toISOString(),
        };
    } catch (error) {
        console.error("Error fetching passport:", error);
        return null;
    }
}
