'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { db } from '@/lib/firebase/config';
import { collection, query, where, getDocs, writeBatch, Timestamp } from 'firebase/firestore';
import { getAutoRepricingSettings } from '@/app/admin/auto-repricing/actions';
import { Product } from '@/lib/types';
import { sendNotification, getSuperAdminId } from '@/services/notifications';

// This flow would be triggered by a scheduled job (e.g., a cron job calling an HTTP endpoint)
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
        const settings = await getAutoRepricingSettings();
        if (!settings) {
            return { success: false, message: 'Auto-repricing settings not configured.', repricedProducts: [] };
        }

        const { viewThreshold, priceDropPercentage, waitingPeriodHours } = settings;
        const now = Timestamp.now();
        const waitingPeriodMillis = waitingPeriodHours * 60 * 60 * 1000;

        const productsRef = collection(db, 'products');
        const q = query(
            productsRef,
            where('autoRepricingEnabled', '==', true),
            where('uniqueViews', '>=', viewThreshold)
        );

        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
            return { success: true, message: 'No products met the view threshold.', repricedProducts: [] };
        }
        
        const batch = writeBatch(db);
        const repricedProducts: string[] = [];
        const notificationsToSend: Promise<any>[] = [];

        const adminId = await getSuperAdminId();
        if (!adminId) {
            console.warn('Super admin ID not found. Auto-repricing notifications will not be sent.');
        }

        for (const doc of querySnapshot.docs) {
            const product = { id: doc.id, ...doc.data() } as Product;
            
            if (product.lastViewedTimestamp) {
                const lastViewedMillis = product.lastViewedTimestamp.toMillis();
                const timeSinceLastView = now.toMillis() - lastViewedMillis;

                if (timeSinceLastView >= waitingPeriodMillis) {
                    const newPrice = product.price * (1 - priceDropPercentage / 100);
                    
                    // Add update to batch
                    batch.update(doc.ref, { price: newPrice });
                    repricedProducts.push(product.id);

                    // Prepare notification for the admin
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

        if (repricedProducts.length > 0) {
            await batch.commit();
            await Promise.all(notificationsToSend);
            return {
                success: true,
                message: `Successfully repriced ${repricedProducts.length} products.`,
                repricedProducts,
            };
        }

        return { success: true, message: 'No products were eligible for a price drop at this time.', repricedProducts: [] };
    }
);
