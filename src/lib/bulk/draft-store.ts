/** Remembers Fast Bulk / Autofast draft ids on this device so the review grid can reopen them. */
const KEY = 'benched:bulk-drafts';

export function loadDraftIds(): string[] {
  try { const v = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []; } catch { return []; }
}
export function addDraftId(id: string) {
  const ids = loadDraftIds();
  if (!ids.includes(id)) { ids.push(id); try { localStorage.setItem(KEY, JSON.stringify(ids.slice(-1000))); } catch { /* quota */ } }
}
export function removeDraftIds(remove: string[]) {
  const set = new Set(remove);
  try { localStorage.setItem(KEY, JSON.stringify(loadDraftIds().filter((i) => !set.has(i)))); } catch { /* ignore */ }
}
