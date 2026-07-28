import { db } from '@/lib/firebase/config';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { SiteConfig, DEFAULT_SITE_CONFIG } from '@/lib/types/site-config';

const CONFIG_DOC_PATH = ['site_config', 'current'] as const;

export async function fetchSiteConfig(): Promise<SiteConfig> {
  try {
    if (!db) return DEFAULT_SITE_CONFIG;
    const docRef = doc(db, CONFIG_DOC_PATH[0], CONFIG_DOC_PATH[1]);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { ...DEFAULT_SITE_CONFIG, ...snap.data() } as SiteConfig;
    }
  } catch (error) {
    console.error('Error fetching site config from Firestore:', error);
  }
  return DEFAULT_SITE_CONFIG;
}

export async function saveSiteConfig(config: SiteConfig): Promise<boolean> {
  try {
    if (!db) throw new Error('Firestore not initialized');
    const docRef = doc(db, CONFIG_DOC_PATH[0], CONFIG_DOC_PATH[1]);
    await setDoc(docRef, {
      ...config,
      updatedAt: Date.now(),
    }, { merge: true });
    return true;
  } catch (error) {
    console.error('Error saving site config to Firestore:', error);
    throw error;
  }
}
