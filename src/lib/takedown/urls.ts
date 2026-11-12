/** Pull a listing id out of a benched.au (or relative) product URL. */
export function extractProductIdFromUrl(raw: string): string | null {
  const v = String(raw || '').trim();
  if (!v) return null;
  try {
    const u = new URL(v, 'https://benched.au');
    const m = u.pathname.match(/\/product\/([^/?#]+)/i);
    return m ? decodeURIComponent(m[1]) : null;
  } catch {
    return null;
  }
}

export const TAKEDOWN_TYPES = ['counterfeit', 'trademark', 'copyright', 'other'] as const;
export type TakedownType = (typeof TAKEDOWN_TYPES)[number];
