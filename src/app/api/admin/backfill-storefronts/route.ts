import { NextResponse } from 'next/server';
import { firestoreDb } from '@/lib/firebase/admin';
import { determineProductStorefrontId } from '@/config/storefronts';

export async function POST(request: Request) {
    try {
        const authHeader = request.headers.get('authorization');
        const internalSecret = process.env.INTERNAL_JOB_SECRET || process.env.CRON_SECRET;
        if (!internalSecret || authHeader !== `Bearer ${internalSecret}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        console.log('[Backfill] Starting storefrontId backfill...');
        const snapshot = await firestoreDb.collection('products').get();

        let updated = 0;
        const counts: Record<string, number> = { basketball: 0, coins: 0, pokemon: 0 };
        const batch = firestoreDb.batch();

        snapshot.forEach((doc: any) => {
            const data = doc.data();
            const sfId = determineProductStorefrontId(data);
            counts[sfId] = (counts[sfId] || 0) + 1;
            if (data.storefrontId !== sfId) {
                batch.update(doc.ref, { storefrontId: sfId });
                updated++;
            }
        });

        if (updated > 0) {
            await batch.commit();
        }

        return NextResponse.json({
            success: true,
            totalProducts: snapshot.size,
            updatedCount: updated,
            counts
        });
    } catch (e: any) {
        console.error('[Backfill] Failed:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

