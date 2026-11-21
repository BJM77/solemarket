import 'server-only';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { FieldValue } from 'firebase-admin/firestore';
import { firestoreDb } from '@/lib/firebase/admin';
import { getAutoRepricingSettings } from '@/app/admin/auto-repricing/actions';
import { sendNotification } from '@/services/notifications';
import { SUPER_ADMIN_UIDS } from '@/lib/constants';
import { decideReprice } from '@/lib/repricing/decide';

// Server-only module (no 'use server'): runAutoRepricing must never be callable as a public
// server action. It runs from the CRON_SECRET-protected cron route or the admin-gated action.

const BATCH_LIMIT = 400;

export async function runAutoRepricing(): Promise<{
    success: boolean;
    message: string;
    repricedProducts: string[];
}> {
    const settings = await getAutoRepricingSettings();
    if (!settings) {
        return { success: false, message: 'Auto-repricing settings not configured.', repricedProducts: [] };
    }

    // Needs the (autoRepricingEnabled, uniqueViews) composite index in firestore.indexes.json.
    const snapshot = await firestoreDb
        .collection('products')
        .where('autoRepricingEnabled', '==', true)
        .where('uniqueViews', '>=', settings.viewThreshold)
        .get();

    if (snapshot.empty) {
        return { success: true, message: 'No products met the view threshold.', repricedProducts: [] };
    }

    const now = Date.now();
    const adminId = SUPER_ADMIN_UIDS[0];
    const repricedProducts: string[] = [];
    const notices: { title: string; newPrice: number; id: string }[] = [];
    let batch = firestoreDb.batch();
    let pending = 0;

    for (const doc of snapshot.docs) {
        const data: any = doc.data();
        // Status, waiting periods and the 50% floor are all checked in decideReprice.
        const decision = decideReprice(data, settings, now);
        if (!decision) continue;

        batch.update(doc.ref, {
            price: decision.newPrice,
            ...(Number(data.originalPrice) > 0 ? {} : { originalPrice: decision.originalPrice }),
            lastRepricedAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        });
        pending++;
        repricedProducts.push(doc.id);
        notices.push({ title: String(data.title || 'Listing'), newPrice: decision.newPrice, id: doc.id });

        if (pending >= BATCH_LIMIT) {
            await batch.commit();
            batch = firestoreDb.batch();
            pending = 0;
        }
    }
    if (pending > 0) await batch.commit();

    if (!repricedProducts.length) {
        return { success: true, message: 'No products were eligible for a price drop at this time.', repricedProducts: [] };
    }

    if (adminId) {
        await Promise.allSettled(notices.map((n) => sendNotification(
            adminId,
            'system',
            'Auto-Repricing Alert',
            `The price for "${n.title}" has been automatically reduced to $${n.newPrice.toFixed(2)}.`,
            `/product/${n.id}`,
        )));
    }

    return {
        success: true,
        message: `Successfully repriced ${repricedProducts.length} product(s).`,
        repricedProducts,
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
