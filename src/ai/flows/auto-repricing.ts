'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { firestoreDb } from '@/lib/firebase/admin';
import { getAutoRepricingSettings } from '@/app/admin/auto-repricing/actions';
import { Product } from '@/lib/types';
import { sendNotification } from '@/services/notifications';
import { SUPER_ADMIN_UIDS } from '@/lib/constants';

export async function runAutoRepricing(): Promise<{
    success: boolean;
    message: string;
    repricedProducts: string[];
}> {
    const settings = await getAutoRepricingSettings();
    if (!settings) {
        return { success: false, message: 'Auto-repricing settings not configured.', repricedProducts: [] };
    }

    const { viewThreshold, priceDropPercentage, waitingPeriodHours } = settings;
    const now = Date.now();
    const waitingPeriodMillis = waitingPeriodHours * 60 * 60 * 1000;

    const snapshot = await firestoreDb
        .collection('products')
        .where('autoRepricingEnabled', '==', true)
        .where('uniqueViews', '>=', viewThreshold)
        .get();

    if (snapshot.empty) {
        return { success: true, message: 'No products met the view threshold.', repricedProducts: [] };
    }

    const batch = firestoreDb.batch();
    const repricedProducts: string[] = [];
    const notificationsToSend: Promise<any>[] = [];
    const adminId = SUPER_ADMIN_UIDS[0];

    for (const doc of snapshot.docs) {
        const product = { id: doc.id, ...doc.data() } as Product;

        // Determine last viewed timestamp
        let lastViewedMillis: number | null = null;
        if (product.lastViewedTimestamp) {
            if (typeof (product.lastViewedTimestamp as any).toMillis === 'function') {
                lastViewedMillis = (product.lastViewedTimestamp as any).toMillis();
            } else if (typeof (product.lastViewedTimestamp as any).toDate === 'function') {
                lastViewedMillis = (product.lastViewedTimestamp as any).toDate().getTime();
            } else if ((product.lastViewedTimestamp as any) instanceof Date) {
                lastViewedMillis = (product.lastViewedTimestamp as any).getTime();
            } else if (typeof product.lastViewedTimestamp === 'string' || typeof product.lastViewedTimestamp === 'number') {
                lastViewedMillis = new Date(product.lastViewedTimestamp).getTime();
            }
        }

        if (lastViewedMillis && !isNaN(lastViewedMillis)) {
            const timeSinceLastView = now - lastViewedMillis;

            if (timeSinceLastView >= waitingPeriodMillis) {
                const currentPrice = Number(product.price) || 0;
                if (currentPrice > 0) {
                    const newPrice = Math.max(1, Math.round(currentPrice * (1 - priceDropPercentage / 100) * 100) / 100);

                    batch.update(doc.ref, {
                        price: newPrice,
                        updatedAt: new Date(),
                    });
                    repricedProducts.push(product.id);

                    if (adminId) {
                        const notificationPromise = sendNotification(
                            adminId,
                            'system',
                            'Auto-Repricing Alert',
                            `The price for "${product.title}" has been automatically reduced to $${newPrice.toFixed(2)}.`,
                            `/product/${product.id}`
                        );
                        notificationsToSend.push(notificationPromise);
                    }
                }
            }
        }
    }

    if (repricedProducts.length > 0) {
        await batch.commit();
        await Promise.allSettled(notificationsToSend);
        return {
            success: true,
            message: `Successfully repriced ${repricedProducts.length} product(s).`,
            repricedProducts,
        };
    }

    return {
        success: true,
        message: 'No products were eligible for a price drop at this time.',
        repricedProducts: [],
    };
}

export const autoRepriceProductsFlow = ai.defineFlow(
    {
        name: 'autoRepriceProductsFlow',
        inputSchema: z.null(),
        outputSchema: z.object({
            success: z.boolean(),
            message: z.string(),
            repricedProducts: z.array(z.string()),
        }),
    },
    async () => {
        return runAutoRepricing();
    }
);
