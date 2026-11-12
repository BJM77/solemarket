/**
 * Recently viewed listings (desktop header strip). Pure helpers + a tiny localStorage store.
 * Only id, title, a thumbnail URL and the listing URL are kept, newest first, max 5.
 */
export interface RecentView { id: string; title: string; thumb?: string; url: string; at: number }

export const RECENT_VIEWS_KEY = 'benched_recent_views_v1';
export const RECENT_VIEWS_MAX = 5;
export const RECENT_VIEWS_EVENT = 'benched:recent-views';

function isRecentView(v: unknown): v is RecentView {
  const r = v as RecentView;
  return !!r && typeof r.id === 'string' && !!r.id && typeof r.title === 'string' && typeof r.url === 'string' && r.url.startsWith('/');
}

/** Parse stored JSON defensively: bad/foreign data becomes an empty list. */
export function parseRecentViews(raw: string | null | undefined): RecentView[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    if (!Array.isArray(v)) return [];
    return dedupeRecent(v.filter(isRecentView)).map((r) => (r.thumb && !isOptimizableThumb(r.thumb) ? { ...r, thumb: undefined } : r)).slice(0, RECENT_VIEWS_MAX);
  } catch {
    return [];
  }
}

function dedupeRecent(list: RecentView[]): RecentView[] {
  const seen = new Set<string>();
  return list.filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true)));
}

const IMAGE_HOSTS = [/\.googleapis\.com$/i, /\.firebaseapp\.com$/i, /\.appspot\.com$/i, /\.firebasestorage\.app$/i, /(^|\.)unsplash\.com$/i];

/** True for https image URLs next/image may optimise (mirrors images.remotePatterns in next.config). */
export function isOptimizableThumb(url: unknown): url is string {
  if (typeof url !== 'string') return false;
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && IMAGE_HOSTS.some((re) => re.test(u.hostname));
  } catch {
    return false;
  }
}

/** Put `entry` first, drop any older copy of it, cap the list. */
export function addRecentView(list: RecentView[], entry: Omit<RecentView, 'at'> & { at?: number }, max = RECENT_VIEWS_MAX): RecentView[] {
  if (!isRecentView({ ...entry, at: 0 })) return list.slice(0, max);
  const next: RecentView = { id: entry.id, title: entry.title, url: entry.url, at: entry.at ?? Date.now() };
  if (isOptimizableThumb(entry.thumb)) next.thumb = entry.thumb;
  return [next, ...list.filter((r) => r.id !== entry.id)].slice(0, max);
}

export function removeRecentView(list: RecentView[], id: string): RecentView[] {
  return list.filter((r) => r.id !== id);
}

function storage(): Storage | null {
  try { return typeof window !== 'undefined' ? window.localStorage : null; } catch { return null; }
}

export function readRecentViews(): RecentView[] {
  return parseRecentViews(storage()?.getItem(RECENT_VIEWS_KEY));
}

function write(list: RecentView[]): void {
  const s = storage();
  if (!s) return;
  try {
    s.setItem(RECENT_VIEWS_KEY, JSON.stringify(list));
    window.dispatchEvent(new Event(RECENT_VIEWS_EVENT));
  } catch { /* quota / private mode: ignore */ }
}

export function recordRecentView(entry: Omit<RecentView, 'at'>): void {
  write(addRecentView(readRecentViews(), entry));
}

export function forgetRecentView(id: string): void {
  const list = readRecentViews();
  if (list.some((r) => r.id === id)) write(removeRecentView(list, id));
}
