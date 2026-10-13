import 'server-only';
import { unstable_cache } from 'next/cache';
import { firestoreDb } from '@/lib/firebase/admin';
import { DEFAULT_SITE_CONFIG, mergeSiteConfig, type SiteConfig } from '@/lib/types/site-config';

export const SITE_CONFIG_TAG = 'site-config';

// Errors are thrown (not cached) so a transient Firestore failure doesn't pin defaults for an hour.
const loadPublished = unstable_cache(
  async (): Promise<SiteConfig> => {
    const snap = await firestoreDb.collection('site_config').doc('current').get();
    return snap.exists ? mergeSiteConfig(snap.data() as Partial<SiteConfig>) : DEFAULT_SITE_CONFIG;
  },
  ['site-config-current'],
  { tags: [SITE_CONFIG_TAG], revalidate: 3600 }
);

/**
 * Published site config (site_config/current), read with the Admin SDK and cached under
 * the 'site-config' tag. Publishing/restoring calls revalidateTag(SITE_CONFIG_TAG).
 */
export async function getPublishedSiteConfig(): Promise<SiteConfig> {
  try {
    return await loadPublished();
  } catch (e) {
    console.warn('[site-config] falling back to defaults:', (e as Error)?.message);
    return DEFAULT_SITE_CONFIG;
  }
}
