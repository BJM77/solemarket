
'use server';

import { firestoreDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { assertRateLimit, RateLimitError, clientIp } from '@/lib/rate-limit-guard';
import { isHoneypotFilled } from '@/lib/checkout/guest-validation';
import { extractProductIdFromUrl, TAKEDOWN_TYPES, type TakedownType } from '@/lib/takedown/urls';

export type SubmitTakedownInput = {
  name: string;
  organisation?: string;
  email: string;
  listingUrls: string;
  type: TakedownType | string;
  description: string;
  declaration: boolean;
  website?: unknown;
};

function clean(s: unknown, max: number) {
  return String(s ?? '').trim().replace(/\s+/g, ' ').slice(0, max);
}

export async function submitTakedownRequestAction(input: SubmitTakedownInput): Promise<{ success: true } | { success: false; error: string }> {
  try {
    if (isHoneypotFilled(input?.website)) {
      return { success: true };
    }

    const name = clean(input?.name, 120);
    const organisation = clean(input?.organisation, 160) || null;
    const email = clean(input?.email, 254).toLowerCase();
    const listingUrlsRaw = String(input?.listingUrls ?? '').trim().slice(0, 4000);
    const type = TAKEDOWN_TYPES.includes(input?.type as TakedownType) ? (input.type as TakedownType) : null;
    const description = String(input?.description ?? '').trim().slice(0, 4000);
    const declaration = input?.declaration === true;

    if (name.length < 2) return { success: false, error: 'Enter your name.' };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return { success: false, error: 'Enter a valid email address.' };
    if (!type) return { success: false, error: 'Choose a report type.' };
    if (description.length < 10) return { success: false, error: 'Please describe the issue (at least 10 characters).' };
    if (!declaration) return { success: false, error: 'You need to confirm the good-faith declaration.' };

    const urls = listingUrlsRaw
      .split(/[\n,]+/)
      .map((u) => u.trim())
      .filter(Boolean)
      .slice(0, 20);
    if (!urls.length) return { success: false, error: 'Enter at least one listing URL.' };

    const listingIds = [...new Set(urls.map(extractProductIdFromUrl).filter(Boolean))] as string[];

    const ip = await clientIp();
    await assertRateLimit('takedown-request', { limit: 5, windowSeconds: 3600, identifier: ip });

    const ref = firestoreDb.collection('takedown_requests').doc();
    await ref.set({
      id: ref.id,
      name,
      organisation,
      email,
      listingUrls: urls,
      listingIds,
      type,
      description,
      declaration: true,
      status: 'new',
      ip,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return { success: true };
  } catch (e: any) {
    if (e instanceof RateLimitError) {
      return { success: false, error: 'Too many reports from this connection. Please wait an hour and try again.' };
    }
    console.error('submitTakedownRequestAction', e);
    return { success: false, error: 'We could not save this report. Please try again.' };
  }
}
