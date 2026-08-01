import { NextResponse } from 'next/server';
import { firestoreDb } from '@/lib/firebase/admin';
import * as admin from 'firebase-admin';
import { verifyExternalUrlStatus } from '@/app/actions/marketplace/products';
import type { Product } from '@/lib/types';

export const revalidate = 0; // Dynamic route

export async function GET(request: Request) {
  try {
    // Optional secret key authorization check for Cron jobs (Vercel Cron or custom cron)
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');
    
    // Query active products that have an externalUrl set
    const snapshot = await firestoreDb
      .collection('products')
      .where('status', '==', 'available')
      .where('externalUrl', '!=', null)
      .limit(50)
      .get();

    if (snapshot.empty) {
      return NextResponse.json({
        success: true,
        message: 'No active external listings to check.',
        checkedCount: 0,
        markedSold: 0,
      });
    }

    let markedSold = 0;
    let checkedCount = 0;
    const results: Array<{ productId: string; externalUrl: string; isAvailable: boolean; reason?: string }> = [];

    for (const doc of snapshot.docs) {
      const product = doc.data() as Product;
      if (!product.externalUrl) continue;

      checkedCount++;
      const check = await verifyExternalUrlStatus(product.externalUrl);
      const now = admin.firestore.FieldValue.serverTimestamp();

      if (!check.isAvailable) {
        await doc.ref.update({
          status: 'sold',
          soldAt: now,
          lastExternalCheckAt: now,
          externalStatusReason: check.reason || 'Facebook listing unavailable',
        });
        markedSold++;
      } else {
        await doc.ref.update({
          lastExternalCheckAt: now,
        });
      }

      results.push({
        productId: doc.id,
        externalUrl: product.externalUrl,
        isAvailable: check.isAvailable,
        reason: check.reason,
      });

      // Brief 500ms delay between checks to avoid aggressive request bursts
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      checkedCount,
      markedSold,
      results,
    });
  } catch (error: any) {
    console.error('Error in cron check-external-urls:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
