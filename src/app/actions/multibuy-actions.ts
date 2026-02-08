'use server';

import { firestoreDb as adminDb } from '@/lib/firebase/admin';
import { MultibuyTemplate, MultibuyTier, MultibuyDiscount } from '@/types/multibuy';
import { revalidatePath } from 'next/cache';

/**
 * Get all multibuy templates
 */
export async function getMultibuyTemplates(): Promise<MultibuyTemplate[]> {
    try {
        const snapshot = await adminDb
            .collection('multibuy_templates')
            .orderBy('isDefault', 'desc')
            .orderBy('createdAt', 'desc')
            .get();

        return snapshot.docs.map((doc: any) => ({
            id: doc.id,
            ...doc.data()
        } as MultibuyTemplate));
    } catch (error) {
        console.error('Error fetching multibuy templates:', error);
        return [];
    }
}

/**
 * Create a new multibuy template
 */
export async function createMultibuyTemplate(data: {
    name: string;
    description: string;
    tiers: MultibuyTier[];
    isDefault?: boolean;
}): Promise<{ success: boolean; error?: string; id?: string }> {
    try {
        // Validate tiers
        const validation = validateTiers(data.tiers);
        if (!validation.valid) {
            return { success: false, error: validation.error };
        }

        // If setting as default, unset other defaults
        if (data.isDefault) {
            const defaultTemplates = await adminDb
                .collection('multibuy_templates')
                .where('isDefault', '==', true)
                .get();

            const batch = adminDb.batch();
            defaultTemplates.docs.forEach((doc: any) => {
                batch.update(doc.ref, { isDefault: false });
            });
            await batch.commit();
        }

        const now = new Date();
        const docRef = await adminDb.collection('multibuy_templates').add({
            name: data.name,
            description: data.description,
            tiers: data.tiers,
            isDefault: data.isDefault || false,
            createdAt: now,
            updatedAt: now,
        });

        revalidatePath('/admin/multibuy');
        return { success: true, id: docRef.id };
    } catch (error: any) {
        console.error('Error creating multibuy template:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Update an existing multibuy template
 */
export async function updateMultibuyTemplate(
    id: string,
    data: {
        name?: string;
        description?: string;
        tiers?: MultibuyTier[];
        isDefault?: boolean;
    }
): Promise<{ success: boolean; error?: string }> {
    try {
        // Validate tiers if provided
        if (data.tiers) {
            const validation = validateTiers(data.tiers);
            if (!validation.valid) {
                return { success: false, error: validation.error };
            }
        }

        // If setting as default, unset other defaults
        if (data.isDefault) {
            const defaultTemplates = await adminDb
                .collection('multibuy_templates')
                .where('isDefault', '==', true)
                .get();

            const batch = adminDb.batch();
            defaultTemplates.docs.forEach((doc: any) => {
                if (doc.id !== id) {
                    batch.update(doc.ref, { isDefault: false });
                }
            });
            await batch.commit();
        }

        await adminDb.collection('multibuy_templates').doc(id).update({
            ...data,
            updatedAt: new Date(),
        });

        revalidatePath('/admin/multibuy');
        return { success: true };
    } catch (error: any) {
        console.error('Error updating multibuy template:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Delete a multibuy template
 */
export async function deleteMultibuyTemplate(id: string): Promise<{ success: boolean; error?: string }> {
    try {
        await adminDb.collection('multibuy_templates').doc(id).delete();
        revalidatePath('/admin/multibuy');
        return { success: true };
    } catch (error: any) {
        console.error('Error deleting multibuy template:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Set a template as default
 */
export async function setDefaultTemplate(id: string): Promise<{ success: boolean; error?: string }> {
    try {
        // Unset all defaults
        const defaultTemplates = await adminDb
            .collection('multibuy_templates')
            .where('isDefault', '==', true)
            .get();

        const batch = adminDb.batch();
        defaultTemplates.docs.forEach((doc: any) => {
            batch.update(doc.ref, { isDefault: false });
        });

        // Set new default
        const templateRef = adminDb.collection('multibuy_templates').doc(id);
        batch.update(templateRef, { isDefault: true, updatedAt: new Date() });

        await batch.commit();
        revalidatePath('/admin/multibuy');
        return { success: true };
    } catch (error: any) {
        console.error('Error setting default template:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Calculate multibuy discount for a given quantity
 */
export function calculateMultibuyDiscount(
    basePrice: number,
    quantity: number,
    tiers: MultibuyTier[]
): MultibuyDiscount {
    // Find applicable tier (highest quantity that's <= purchased quantity)
    const applicableTier = tiers
        .filter(tier => quantity >= tier.minQuantity)
        .sort((a, b) => b.minQuantity - a.minQuantity)[0];

    if (!applicableTier) {
        return {
            originalPrice: basePrice * quantity,
            discountedPrice: basePrice * quantity,
            discountPercent: 0,
            savings: 0,
            tierApplied: null,
        };
    }

    const discountMultiplier = 1 - (applicableTier.discountPercent / 100);
    const discountedPrice = basePrice * discountMultiplier * quantity;
    const originalPrice = basePrice * quantity;

    return {
        originalPrice,
        discountedPrice,
        discountPercent: applicableTier.discountPercent,
        savings: originalPrice - discountedPrice,
        tierApplied: applicableTier,
    };
}

/**
 * Validate multibuy tiers
 */
function validateTiers(tiers: MultibuyTier[]): { valid: boolean; error?: string } {
    if (!tiers || tiers.length === 0) {
        return { valid: false, error: 'At least one tier is required' };
    }

    if (tiers.length > 5) {
        return { valid: false, error: 'Maximum 5 tiers allowed' };
    }

    // Check for valid quantities and discounts
    for (const tier of tiers) {
        if (tier.minQuantity < 2) {
            return { valid: false, error: 'Minimum quantity must be at least 2' };
        }
        if (tier.discountPercent < 1 || tier.discountPercent > 50) {
            return { valid: false, error: 'Discount must be between 1% and 50%' };
        }
    }

    // Check for duplicates
    const quantities = tiers.map(t => t.minQuantity);
    if (new Set(quantities).size !== quantities.length) {
        return { valid: false, error: 'Duplicate quantity values not allowed' };
    }

    // Check ascending order
    const sorted = [...tiers].sort((a, b) => a.minQuantity - b.minQuantity);
    const isOrdered = tiers.every((tier, i) => tier.minQuantity === sorted[i].minQuantity);
    if (!isOrdered) {
        return { valid: false, error: 'Tiers must be in ascending order by quantity' };
    }

    return { valid: true };
}
