'use client';
import { uploadImages } from '@/lib/firebase/storage';
import { getCurrentUserIdToken } from '@/lib/firebase/auth';
import { saveDraftListing } from '@/app/actions/seller/sell';
import { identifyCardForEbay } from '@/ai/flows/identify-card-autocard';
import { buildDraftFields } from '@/lib/autocard/draft';
import { addDraftId } from './draft-store';

export interface BulkDefaults { price?: number; condition?: string }

/** Downscaled JPEG data URI for AI identification. */
export async function toSmallDataUri(blob: Blob, maxW = 800): Promise<string> {
  const bmp = await createImageBitmap(blob);
  const k = Math.min(1, maxW / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close?.();
  return c.toDataURL('image/jpeg', 0.85);
}

/**
 * Upload (uploadImages shrinks to a 1600px / 0.8MB WebP), AI-identify and save one card as a DRAFT.
 * AI failure still saves a draft; upload/save failure throws so the queue can retry.
 */
export async function createCardDraft(uid: string, front: Blob, back: Blob | null, defaults: BulkDefaults = {}): Promise<{ draftId: string; identified: boolean; title: string }> {
  const files = [new File([front], 'card-front.jpg', { type: front.type || 'image/jpeg' })];
  if (back) files.push(new File([back], 'card-back.jpg', { type: back.type || 'image/jpeg' }));
  const identify = async () => {
    try {
      const f = await toSmallDataUri(front);
      const b = back ? await toSmallDataUri(back) : f;
      return await identifyCardForEbay((await getCurrentUserIdToken()) ?? '', f, b);
    } catch (e: any) { return { ok: false as const, error: e?.message || 'Identification failed' }; }
  };
  const [imageUrls, idRes] = await Promise.all([uploadImages(files, `products/${uid}`), identify()]);
  const fields = buildDraftFields(idRes.ok ? idRes.identity : null);
  if (defaults.price && defaults.price > 0) fields.price = defaults.price;
  if (defaults.condition && !String(fields.gradingCompany || 'Raw').match(/PSA|BGS|CGC|SGC/)) fields.condition = defaults.condition;
  const draftId = await saveDraftListing((await getCurrentUserIdToken()) ?? '', {
    ...fields, quantity: 1, isReverseBidding: false, autoRepricingEnabled: false, isVault: false, imageUrls,
  } as any);
  addDraftId(draftId);
  return { draftId, identified: idRes.ok, title: fields.title };
}
