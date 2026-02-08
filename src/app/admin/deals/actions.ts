'use server';

/**
 * Multi-Card Deal Engine Server Actions
 */

import { firestoreDb } from '@/lib/firebase/admin';
import { Deal, DealValidationResult, MultiCardTier } from '@/types/deals';
import { Timestamp } from 'firebase-admin/firestore';

/**
 * Create a new deal
 */
export async function createDeal(
    deal: Omit<Deal, 'id' | 'createdAt' | 'timesUsed'>
): Promise<string> {
    const dealData = {
        ...deal,
        createdAt: Timestamp.now(),
        timesUsed: 0,
    };

    const docRef = await firestoreDb.collection('deals').add(dealData);
    return docRef.id;
}

/**
 * Update an existing deal
 */
export async function updateDeal(
    dealId: string,
    updates: Partial<Deal>
): Promise<void> {
    await firestoreDb.collection('deals').doc(dealId).update({
        ...updates,
        updatedAt: Timestamp.now(),
    });
}

/**
 * Toggle deal active status
 */
export async function toggleDealStatus(dealId: string): Promise<boolean> {
    const dealDoc = await firestoreDb.collection('deals').doc(dealId).get();
    const deal = dealDoc.data();

    if (!deal) {
        throw new Error('Deal not found');
    }

    const newStatus = !deal.isActive;
    await firestoreDb.collection('deals').doc(dealId).update({
        isActive: newStatus,
        updatedAt: Timestamp.now(),
    });

    return newStatus;
}

/**
 * Delete a deal
 */
export async function deleteDeal(dealId: string): Promise<void> {
    await firestoreDb.collection('deals').doc(dealId).delete();
}

/**
 * Get all deals (optionally filter by active status)
 */
export async function getDeals(activeOnly: boolean = false) {
    let query = firestoreDb.collection('deals').orderBy('createdAt', 'desc');

    if (activeOnly) {
        query = query.where('isActive', '==', true) as any;
    }

    const snapshot = await query.get();

    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
    })) as Deal[];
}

/**
 * Get a single deal by ID
 */
export async function getDeal(dealId: string): Promise<Deal | null> {
    const doc = await firestoreDb.collection('deals').doc(dealId).get();

    if (!doc.exists) {
        return null;
    }

    return {
        id: doc.id,
        ...doc.data(),
    } as Deal;
}

/**
 * Get a deal by code
 */
export async function getDealByCode(code: string): Promise<Deal | null> {
    const snapshot = await firestoreDb
        .collection('deals')
        .where('code', '==', code.toUpperCase())
        .where('isActive', '==', true)
        .limit(1)
        .get();

    if (snapshot.empty) {
        return null;
    }

    const doc = snapshot.docs[0];
    return {
        id: doc.id,
        ...doc.data(),
    } as Deal;
}

/**
 * Validate cart items against deal requirements
 */
export async function validateDealCart(
    dealId: string,
    cartItems: Array<{ productId: string; tier: MultiCardTier }>
): Promise<DealValidationResult> {
    const deal = await getDeal(dealId);

    if (!deal) {
        return {
            isValid: false,
            errors: ['Deal not found'],
        };
    }

    if (!deal.isActive) {
        return {
            isValid: false,
            errors: ['This deal is no longer active'],
        };
    }

    // Count items by tier
    const counts = {
        base: 0,
        premium: 0,
        limited: 0,
    };

    for (const item of cartItems) {
        if (item.tier === 'base') counts.base++;
        else if (item.tier === 'premium') counts.premium++;
        else if (item.tier === 'limited') counts.limited++;
    }

    // Check if requirements are met
    const errors: string[] = [];
    const missingSlots = {
        base: Math.max(0, deal.requirements.base - counts.base),
        premium: Math.max(0, deal.requirements.premium - counts.premium),
        limited: Math.max(0, deal.requirements.limited - counts.limited),
    };

    if (missingSlots.base > 0) {
        errors.push(`Need ${missingSlots.base} more Base card(s)`);
    }
    if (missingSlots.premium > 0) {
        errors.push(`Need ${missingSlots.premium} more Premium card(s)`);
    }
    if (missingSlots.limited > 0) {
        errors.push(`Need ${missingSlots.limited} more Limited card(s)`);
    }

    // Check for excess items
    if (counts.base > deal.requirements.base) {
        errors.push(`Too many Base cards (max ${deal.requirements.base})`);
    }
    if (counts.premium > deal.requirements.premium) {
        errors.push(`Too many Premium cards (max ${deal.requirements.premium})`);
    }
    if (counts.limited > deal.requirements.limited) {
        errors.push(`Too many Limited cards (max ${deal.requirements.limited})`);
    }

    return {
        isValid: errors.length === 0,
        errors,
        missingSlots: errors.length > 0 ? missingSlots : undefined,
    };
}

/**
 * Increment deal usage counter
 */
export async function incrementDealUsage(dealId: string): Promise<void> {
    await firestoreDb.collection('deals').doc(dealId).update({
        timesUsed: (firestoreDb as any).FieldValue.increment(1),
    });
}

/**
 * Bulk update product tiers
 */
export async function bulkUpdateTier(
    productIds: string[],
    tier: MultiCardTier
): Promise<number> {
    let updatedCount = 0;

    for (const productId of productIds) {
        try {
            await firestoreDb.collection('products').doc(productId).update({
                multiCardTier: tier,
                updatedAt: Timestamp.now(),
            });
            updatedCount++;
        } catch (error) {
            console.error(`Error updating tier for ${productId}:`, error);
        }
    }

    return updatedCount;
}

/**
 * Auto-classify products by price into tiers
 */
export async function autoClassifyByPrice(productIds: string[]): Promise<number> {
    let classifiedCount = 0;

    for (const productId of productIds) {
        try {
            const productDoc = await firestoreDb.collection('products').doc(productId).get();
            const product = productDoc.data();

            if (!product) continue;

            // Use market data average if available, otherwise use current price
            const price = product.marketData?.averageSoldPrice || product.price || 0;

            let tier: MultiCardTier;
            if (price < 5) {
                tier = 'base';
            } else if (price < 50) {
                tier = 'premium';
            } else {
                tier = 'limited';
            }

            await firestoreDb.collection('products').doc(productId).update({
                multiCardTier: tier,
                updatedAt: Timestamp.now(),
            });

            classifiedCount++;
        } catch (error) {
            console.error(`Error classifying ${productId}:`, error);
        }
    }

    return classifiedCount;
}

/**
 * Get products by tier
 */
export async function getProductsByTier(tier: MultiCardTier, limit: number = 50) {
    const snapshot = await firestoreDb
        .collection('products')
        .where('multiCardTier', '==', tier)
        .limit(limit)
        .get();

    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
    }));
}
