import type { User } from 'firebase/auth';

/**
 * Creates/refreshes the server session cookie. If the server just changed the
 * user's role claim it asks for a refresh; we force a new ID token and post once more
 * so the session cookie (read by middleware for /admin) carries the role.
 */
export async function syncSessionCookie(user: User): Promise<void> {
  const post = async (idToken: string) => {
    const res = await fetch('/api/auth/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });
    try { return await res.json(); } catch { return {}; }
  };
  const first = await post(await user.getIdToken());
  if (first?.refreshToken) {
    await post(await user.getIdToken(true));
  }
}
