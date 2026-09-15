import { NextResponse } from 'next/server';
import { firestoreDb } from '@/lib/firebase/admin';
import { syncMarketDataForProduct } from '@/services/market-data-sync';

export const maxDuration = 60;  // Pro tier limits
export const dynamic = 'force-dynamic';

const BATCH_SIZE = 2;

export async function GET(request: Request) {
  // 1. Auth via Vercel Cron header
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Query candidates
  const now = Date.now();
  const candidatesSnap = await firestoreDb.collection('products')
    .where('status', '==', 'available')
    .orderBy('marketData.lastAttemptAt', 'asc')
    .limit(BATCH_SIZE * 4) // Fetch more than we need, then filter backoffs in memory
    .get();

  const eligible = candidatesSnap.docs
    .map((d: any) => ({ id: d.id, data: d.data() }))
    .filter(({ data }: { data: any }) => {
      const md = data.marketData ?? {};
      const failures = md.consecutiveFailures ?? 0;
      // Hard stop after 5 consecutive failures
      if (failures >= 5) return false;

      const lastAttempt = md.lastAttemptAt?.toMillis?.() ?? 0;
      // Exponential backoff: 0 fails = 0h, 1 fail = 1h, 2 fails = 2h, 3 fails = 4h, 4 fails = 8h
      const backoffHours = Math.pow(2, Math.max(0, failures - 1));
      const backoffMs = backoffHours * 60 * 60 * 1000;
      return now - lastAttempt >= backoffMs;
    })
    .slice(0, BATCH_SIZE);

  // 3. Process the batch
  const results = await Promise.allSettled(
    eligible.map(({ id }: { id: string }) => syncMarketDataForProduct(id))
  );

  const succeeded = results.filter(r => r.status === 'fulfilled' && (r as any).value?.ok).length;
  const failed = results.length - succeeded;

  return NextResponse.json({
    processed: results.length,
    succeeded,
    failed,
    productIds: eligible.map((e: any) => e.id),
  });
}
