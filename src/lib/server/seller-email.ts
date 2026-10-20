import 'server-only';
import { firestoreDb, authAdmin } from '@/lib/firebase/admin';

/**
 * Server-only lookup of a seller's email. Product docs no longer carry sellerEmail
 * (they are publicly readable), so read users/{sellerId} with the Admin SDK and fall
 * back to Firebase Auth.
 */
export async function getSellerEmail(sellerId?: string | null): Promise<string | null> {
    if (!sellerId) return null;
    try {
        const snap = await firestoreDb.collection('users').doc(String(sellerId)).get();
        const email = snap.exists ? snap.data()?.email : null;
        if (typeof email === 'string' && email.includes('@')) return email;
    } catch (e) {
        console.error('getSellerEmail: users lookup failed', e);
    }
    try {
        const rec = await authAdmin.getUser(String(sellerId));
        return rec.email || null;
    } catch {
        return null;
    }
}
