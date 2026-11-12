'use server';

import { firestoreDb, admin } from '@/lib/firebase/admin';
import { verifyIdToken } from '@/lib/firebase/auth-admin';
import { isValidTeamChoice } from '@/lib/team-themes/theme';

/** Save (or clear with null) the signed-in user's favourite NBA team theme. */
export async function saveFavoriteTeam(idToken: string, choice: string | null) {
  try {
    if (typeof idToken !== 'string' || !idToken) return { success: false, message: 'Not signed in.' };
    if (choice !== null && !isValidTeamChoice(choice)) return { success: false, message: 'Unknown team.' };
    const { uid } = await verifyIdToken(idToken);
    await firestoreDb.collection('users').doc(uid).set(
      {
        favoriteTeam: choice === null ? admin.firestore.FieldValue.delete() : choice,
        favoriteTeamUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    return { success: true };
  } catch (error) {
    console.error('saveFavoriteTeam failed:', error);
    return { success: false, message: 'Could not save your team.' };
  }
}

/** Read the signed-in user's saved team theme (null when none or invalid). */
export async function getFavoriteTeam(idToken: string): Promise<{ success: boolean; choice: string | null }> {
  try {
    if (typeof idToken !== 'string' || !idToken) return { success: false, choice: null };
    const { uid } = await verifyIdToken(idToken);
    const snap = await firestoreDb.collection('users').doc(uid).get();
    const v = snap.exists ? snap.get('favoriteTeam') : null;
    return { success: true, choice: isValidTeamChoice(v) ? v : null };
  } catch (error) {
    console.error('getFavoriteTeam failed:', error);
    return { success: false, choice: null };
  }
}
