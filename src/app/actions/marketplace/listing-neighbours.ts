'use server';

import { firestoreDb } from '@/lib/firebase/admin';
import { getProductUrl } from '@/lib/utils/url';

/** Fallback Previous/Next: same category, newest available first. */
export async function getCategoryNeighbours(productId: string): Promise<{ prev: string | null; next: string | null; prevImage?: string | null; nextImage?: string | null }> {
  try {
    if (!productId || productId.length > 200) return { prev: null, next: null };
    const snap = await firestoreDb.collection('products').doc(productId).get();
    const category = snap.exists ? (snap.data() as any)?.category : null;
    if (!category) return { prev: null, next: null };
    const q = await firestoreDb.collection('products')
      .where('category', '==', category)
      .where('status', '==', 'available')
      .orderBy('createdAt', 'desc')
      .limit(200)
      .get();
    const list = q.docs
      .filter((d: any) => !(d.data() as any).isDraft)
      .map((d: any) => ({ id: d.id, image: ((d.data() as any).imageUrls?.[0] as string | undefined) ?? null, url: getProductUrl({ id: d.id, title: (d.data() as any).title || '', category: (d.data() as any).category }) }));
    const i = list.findIndex((e: { id: string }) => e.id === productId);
    if (i < 0) return { prev: null, next: list[0]?.url ?? null, nextImage: list[0]?.image ?? null };
    return { prev: list[i - 1]?.url ?? null, next: list[i + 1]?.url ?? null, prevImage: list[i - 1]?.image ?? null, nextImage: list[i + 1]?.image ?? null };
  } catch (error) {
    console.error('[getCategoryNeighbours]', error);
    return { prev: null, next: null };
  }
}
