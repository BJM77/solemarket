'use server';

/**
 * Multi-Card Deal Engine Server Actions
 */

import { firestoreDb } from '@/lib/firebase/admin';
import { Deal, DealValidationResult, MultiCardTier } from '@/types/deals';
import { Timestamp } from 'firebase-admin/firestore';
import { serializeFirestoreData } from '@/lib/utils';

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
    // Fetch all deals sorted by createdAt (Single Field Index - usually exists or auto-created)
    // Avoids composite index requirement (isActive + createdAt)
    const query = firestoreDb.collection('deals').orderBy('createdAt', 'desc');

    const snapshot = await query.get();

    let deals = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
    })) as Deal[];

    if (activeOnly) {
        deals = deals.filter(d => d.isActive);
    }

    return serializeFirestoreData(deals);
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
        bronze: 0,
        silver: 0,
        gold: 0,
        platinum: 0,
    };

    for (const item of cartItems) {
        if (item.tier === 'bronze') counts.bronze++;
        else if (item.tier === 'silver') counts.silver++;
        else if (item.tier === 'gold') counts.gold++;
        else if (item.tier === 'platinum') counts.platinum++;
    }

    // Check if requirements are met
    const errors: string[] = [];
    const missingSlots = {
        bronze: Math.max(0, deal.requirements.bronze - counts.bronze),
        silver: Math.max(0, deal.requirements.silver - counts.silver),
        gold: Math.max(0, deal.requirements.gold - counts.gold),
        platinum: Math.max(0, deal.requirements.platinum - counts.platinum),
    };

    if (missingSlots.bronze > 0) {
        errors.push(`Need ${missingSlots.bronze} more Bronze card(s)`);
    }
    if (missingSlots.silver > 0) {
        errors.push(`Need ${missingSlots.silver} more Silver card(s)`);
    }
    if (missingSlots.gold > 0) {
        errors.push(`Need ${missingSlots.gold} more Gold card(s)`);
    }
    if (missingSlots.platinum > 0) {
        errors.push(`Need ${missingSlots.platinum} more Platinum card(s)`);
    }

    // Check for excess items
    if (counts.bronze > deal.requirements.bronze) {
        errors.push(`Too many Bronze cards (max ${deal.requirements.bronze})`);
    }
    if (counts.silver > deal.requirements.silver) {
        errors.push(`Too many Silver cards (max ${deal.requirements.silver})`);
    }
    if (counts.gold > deal.requirements.gold) {
        errors.push(`Too many Gold cards (max ${deal.requirements.gold})`);
    }
    if (counts.platinum > deal.requirements.platinum) {
        errors.push(`Too many Platinum cards (max ${deal.requirements.platinum})`);
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
                tier = 'bronze';
            } else if (price < 20) {
                tier = 'silver';
            } else if (price < 50) {
                tier = 'gold';
            } else {
                tier = 'platinum';
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
    // We fetch more items than needed to account for in-memory filtering of non-available items
    const snapshot = await firestoreDb
        .collection('products')
        .where('multiCardTier', '==', tier)
        .limit(limit * 2)
        .get();

    const products = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
    })) as any[];

    // Filter for available items only (in-memory to avoid composite index)
    const filtered = products
        .filter(p => p.status === 'available')
        .slice(0, limit);

    return serializeFirestoreData(filtered);
}
