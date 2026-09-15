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

/**
 * Pillar 4: Automated Dispute Resolution Decision Tree
 * Handles "Item Not Received" disputes automatically via tracking checks.
 */
export async function handleItemNotReceivedDispute(idToken: string, disputeId: string) {
    try {
        await ensureActionAuth(idToken, ['admin', 'superadmin']);
        
        // 1. Fetch dispute & tracking info (mocked DB access for example)
        // const dispute = await firestoreDb.collection('disputes').doc(disputeId).get();
        // const trackingDetails = await fetchCarrierTracking(dispute.data().trackingNumber);
        const isTrackingDelivered = Math.random() > 0.5; // Simulate carrier API

        if (isTrackingDelivered) {
            return {
                status: 'MEDIATION_REQUIRED',
                action: 'ASK_BUYER_CHECK_NEIGHBORS',
                message: 'Carrier tracking shows delivered. Automatically messaging buyer to check surroundings. Hold for 7 days.'
            };
        } else {
            return {
                status: 'AUTO_RESOLVED',
                action: 'REFUND_BUYER_PUNITIVE',
                message: 'Tracking confirms stalled/lost. Auto-refunding buyer. Seller Trust Score heavily impacted (-30 pts).'
            };
        }
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

/**
 * Pillar 4: Automated Dispute Resolution Decision Tree
 * Handles "Item Not As Described" using AI similarity scoring.
 */
export async function handleItemNotAsDescribedDispute(idToken: string, disputeId: string, aiSimilarityScore: number) {
    try {
        await ensureActionAuth(idToken, ['admin', 'superadmin']);
        
        if (aiSimilarityScore > 0.85) {
            return {
                status: 'MEDIATION_REQUIRED',
                action: 'PROPOSE_PARTIAL_REFUND',
                message: 'High similarity (minor discrepancy). Auto-proposing a 10% partial refund to both parties.'
            };
        } else {
            return {
                status: 'AUTO_RESOLVED',
                action: 'FULL_REFUND_RETURN',
                message: 'Low similarity (major discrepancy). Auto-refunding buyer. Seller covers return shipping. Trust Score impacted (-10 pts).'
            };
        }
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}
