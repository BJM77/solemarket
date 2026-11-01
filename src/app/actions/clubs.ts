'use server';

import { revalidateTag, unstable_cache } from 'next/cache';
import { firestoreDb, auth } from '@/lib/firebase/admin';
import { verifyIdToken } from '@/lib/firebase/auth-admin';
import { serializeFirestoreData } from '@/lib/utils/serialization';
import { slugifyClub } from '@/lib/clubs/slug';
import type { Club } from '@/lib/types/club';
import type { Product } from '@/lib/types';

const CLUBS_TAG = 'clubs';

async function requireAdmin(idToken: string) {
  const decoded: any = await verifyIdToken(idToken);
  if (decoded?.role !== 'admin' && decoded?.role !== 'superadmin') throw new Error('Admin access required');
  return decoded.uid as string;
}

function toClub(id: string, d: any): Club {
  return {
    id,
    name: String(d.name || ''),
    slug: String(d.slug || id),
    active: d.active !== false,
    logoUrl: d.logoUrl || undefined,
    tagline: d.tagline || undefined,
    location: d.location || undefined,
    sellerIds: Array.isArray(d.sellerIds) ? d.sellerIds.filter((s: unknown) => typeof s === 'string') : [],
    adminUserIds: Array.isArray(d.adminUserIds) ? d.adminUserIds.filter((s: unknown) => typeof s === 'string') : [],
    adminEmails: Array.isArray(d.adminEmails) ? d.adminEmails.filter((s: unknown) => typeof s === 'string') : [],
    sortOrder: typeof d.sortOrder === 'number' ? d.sortOrder : 0,
  };
}

/** Public, cached: active clubs for the home page and /clubs. */
export const getActiveClubs = unstable_cache(
  async (): Promise<Club[]> => {
    try {
      const snap = await firestoreDb.collection('clubs').where('active', '==', true).get();
      return snap.docs
        .map((d: any) => toClub(d.id, d.data()))
        .sort((a: Club, b: Club) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name));
    } catch (e) {
      console.error('getActiveClubs failed', e);
      return [];
    }
  },
  ['clubs-active'],
  { revalidate: 300, tags: [CLUBS_TAG] }
);

export const getClubBySlug = unstable_cache(
  async (slug: string): Promise<Club | null> => {
    try {
      const snap = await firestoreDb.collection('clubs').where('slug', '==', slug).limit(1).get();
      if (snap.empty) return null;
      const club = toClub(snap.docs[0].id, snap.docs[0].data());
      return club.active ? club : null;
    } catch (e) {
      console.error('getClubBySlug failed', e);
      return null;
    }
  },
  ['club-by-slug'],
  { revalidate: 300, tags: [CLUBS_TAG] }
);

/** Only listings from the club's own seller accounts. */
export const getClubProducts = unstable_cache(
  async (sellerIds: string[]): Promise<Product[]> => {
    const ids = sellerIds.slice(0, 30);
    if (ids.length === 0) return [];
    try {
      const snap = await firestoreDb.collection('products')
        .where('sellerId', 'in', ids)
        .where('status', '==', 'available')
        .limit(200)
        .get();
      const products = snap.docs.map((doc: any) => serializeFirestoreData({ id: doc.id, ...doc.data() })) as Product[];
      const ts = (p: any) => (typeof p.createdAt === 'number' ? p.createdAt : Date.parse(p.createdAt) || 0);
      return products.sort((a, b) => ts(b) - ts(a));
    } catch (e) {
      console.error('getClubProducts failed', e);
      return [];
    }
  },
  ['club-products'],
  { revalidate: 120, tags: [CLUBS_TAG, 'products-sneakers'] }
);

export async function adminListClubs(idToken: string): Promise<Club[]> {
  await requireAdmin(idToken);
  const snap = await firestoreDb.collection('clubs').get();
  return snap.docs.map((d: any) => toClub(d.id, d.data())).sort((a: Club, b: Club) => a.name.localeCompare(b.name));
}

export interface ClubInput {
  name: string;
  slug?: string;
  active: boolean;
  logoUrl?: string;
  tagline?: string;
  location?: string;
  sellerIds: string[];
  /** Stadium admin emails. Existing accounts are linked; missing ones are created (site admin only). */
  adminEmails?: string[];
  sortOrder?: number;
}

async function resolveStadiumAdmins(emails: string[]) {
  const clean = Array.from(new Set(emails.map((e) => e.trim().toLowerCase()).filter(Boolean))).slice(0, 10);
  const uids: string[] = [];
  const setupLinks: { email: string; link: string }[] = [];
  for (const email of clean) {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error(`Invalid stadium admin email: ${email}`);
    let user;
    try {
      user = await auth.getUserByEmail(email);
    } catch (e: any) {
      if (e?.code !== 'auth/user-not-found') throw e;
      user = await auth.createUser({ email });
      try { setupLinks.push({ email, link: await auth.generatePasswordResetLink(email) }); } catch { /* admin can use Forgot password */ }
    }
    uids.push(user.uid);
  }
  return { emails: clean, uids, setupLinks };
}

export async function adminSaveClub(idToken: string, id: string | null, input: ClubInput): Promise<{ success: boolean; error?: string; id?: string; setupLinks?: { email: string; link: string }[] }> {
  try {
    await requireAdmin(idToken);
    const name = input.name.trim();
    if (!name) return { success: false, error: 'Name is required' };
    const slug = slugifyClub(input.slug?.trim() || name);
    if (!slug) return { success: false, error: 'Slug is invalid' };
    const sellerIds = Array.from(new Set(input.sellerIds.map((s) => s.trim()).filter(Boolean))).slice(0, 30);

    const clash = await firestoreDb.collection('clubs').where('slug', '==', slug).limit(2).get();
    if (clash.docs.some((d: any) => d.id !== id)) return { success: false, error: 'Another club already uses that slug' };

    const logoUrl = input.logoUrl?.trim();
    if (logoUrl && !/^https:\/\//.test(logoUrl)) return { success: false, error: 'Logo URL must start with https://' };

    const admins = await resolveStadiumAdmins(input.adminEmails || []);
    const data = {
      adminUserIds: admins.uids,
      adminEmails: admins.emails,
      name,
      slug,
      active: !!input.active,
      logoUrl: logoUrl || null,
      tagline: input.tagline?.trim() || null,
      location: input.location?.trim() || null,
      sellerIds,
      sortOrder: Number(input.sortOrder) || 0,
      updatedAt: Date.now(),
    };
    const ref = id ? firestoreDb.collection('clubs').doc(id) : firestoreDb.collection('clubs').doc();
    await ref.set(id ? data : { ...data, createdAt: Date.now() }, { merge: true });
    revalidateTag(CLUBS_TAG);
    return { success: true, id: ref.id, setupLinks: admins.setupLinks };
  } catch (e: any) {
    return { success: false, error: e?.message || 'Failed to save club' };
  }
}

export async function adminDeleteClub(idToken: string, id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin(idToken);
    await firestoreDb.collection('clubs').doc(id).delete();
    revalidateTag(CLUBS_TAG);
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message || 'Failed to delete club' };
  }
}

/** Clubs the signed-in user is a stadium admin of. Stadium admins cannot create clubs. */
export async function stadiumListMyClubs(idToken: string): Promise<Club[]> {
  const decoded: any = await verifyIdToken(idToken);
  const snap = await firestoreDb.collection('clubs').where('adminUserIds', 'array-contains', decoded.uid).get();
  return snap.docs.map((d: any) => toClub(d.id, d.data()));
}

/** Stadium admin: update only the seller list of a club they administer. */
export async function stadiumUpdateSellers(idToken: string, clubId: string, sellerIds: string[]): Promise<{ success: boolean; error?: string }> {
  try {
    const decoded: any = await verifyIdToken(idToken);
    const ref = firestoreDb.collection('clubs').doc(clubId);
    const doc = await ref.get();
    if (!doc.exists) return { success: false, error: 'Club not found' };
    const adminIds: string[] = doc.data()?.adminUserIds || [];
    if (!adminIds.includes(decoded.uid)) return { success: false, error: 'Not a stadium admin for this club' };
    const ids = Array.from(new Set(sellerIds.map((s) => s.trim()).filter(Boolean))).slice(0, 30);
    await ref.update({ sellerIds: ids, updatedAt: Date.now() });
    revalidateTag(CLUBS_TAG);
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message || 'Failed to update sellers' };
  }
}
