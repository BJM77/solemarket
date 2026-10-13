'use server';

import { revalidateTag } from 'next/cache';
import { FieldValue } from 'firebase-admin/firestore';
import { firestoreDb } from '@/lib/firebase/admin';
import { verifyIdToken } from '@/lib/firebase/auth-admin';
import { mergeSiteConfig, type SiteConfig } from '@/lib/types/site-config';
import { SITE_CONFIG_TAG } from '@/lib/site-config/server';

export interface SiteConfigHistoryEntry {
  id: string;
  publishedAt: number;
  publishedBy: string;
  note?: string;
  restoredFrom?: string;
}

async function requireAdmin(idToken: string): Promise<{ uid: string; email?: string }> {
  const decoded: any = await verifyIdToken(idToken);
  if (decoded?.role !== 'admin' && decoded?.role !== 'superadmin') throw new Error('Admin access required');
  return { uid: decoded.uid, email: decoded.email };
}

const col = () => firestoreDb.collection('site_config');
const history = () => firestoreDb.collection('site_config_history');

/** Strip undefined (Firestore Admin rejects it) and normalise against defaults. */
function clean(config: SiteConfig): SiteConfig {
  const merged = mergeSiteConfig(config);
  delete (merged as any).updatedAt;
  return JSON.parse(JSON.stringify(merged));
}

export async function getSiteConfigDraft(idToken: string): Promise<{ draft: SiteConfig | null; published: SiteConfig }> {
  await requireAdmin(idToken);
  const [d, p] = await Promise.all([col().doc('draft').get(), col().doc('current').get()]);
  return {
    draft: d.exists ? mergeSiteConfig(d.data() as Partial<SiteConfig>) : null,
    published: mergeSiteConfig(p.exists ? (p.data() as Partial<SiteConfig>) : null),
  };
}

export async function saveSiteConfigDraft(idToken: string, config: SiteConfig): Promise<{ ok: true }> {
  const user = await requireAdmin(idToken);
  await col().doc('draft').set({ ...clean(config), updatedAt: Date.now(), updatedBy: user.uid });
  return { ok: true };
}

async function publishConfig(config: SiteConfig, uid: string, extra: { note?: string; restoredFrom?: string } = {}) {
  const now = Date.now();
  const data = clean(config);
  const batch = firestoreDb.batch();
  batch.set(col().doc('current'), { ...data, updatedAt: now, updatedBy: uid });
  batch.set(col().doc('draft'), { ...data, updatedAt: now, updatedBy: uid });
  batch.set(history().doc(), { config: data, publishedAt: now, publishedBy: uid, createdAt: FieldValue.serverTimestamp(), ...extra });
  await batch.commit();
  revalidateTag(SITE_CONFIG_TAG);
}

/** Publish the given config (normally the current draft) and snapshot it to history. */
export async function publishSiteConfig(idToken: string, config: SiteConfig, note?: string): Promise<{ ok: true }> {
  const user = await requireAdmin(idToken);
  await publishConfig(config, user.uid, note ? { note } : {});
  return { ok: true };
}

export async function listSiteConfigHistory(idToken: string, limit = 20): Promise<SiteConfigHistoryEntry[]> {
  await requireAdmin(idToken);
  const snap = await history().orderBy('publishedAt', 'desc').limit(limit).get();
  return snap.docs.map((d: any) => {
    const x = d.data();
    return { id: d.id, publishedAt: x.publishedAt, publishedBy: x.publishedBy, note: x.note, restoredFrom: x.restoredFrom };
  });
}

/** Restore a previous version: it becomes the live config and the draft, and is logged as a new history entry. */
export async function restoreSiteConfig(idToken: string, historyId: string): Promise<{ ok: true; config: SiteConfig }> {
  const user = await requireAdmin(idToken);
  const snap = await history().doc(historyId).get();
  if (!snap.exists) throw new Error('Version not found');
  const config = mergeSiteConfig(snap.data()!.config);
  await publishConfig(config, user.uid, { restoredFrom: historyId, note: 'Restored' });
  return { ok: true, config };
}
