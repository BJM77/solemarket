/** Fast Bulk photo pairing: photos are ordered, then 1+2 = card 1, 3+4 = card 2, ... */

export interface PhotoLike { id: string; name: string; lastModified: number }
export interface CardPair<T extends PhotoLike = PhotoLike> { id: string; front: T; back: T | null }

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

/** Order by capture time (lastModified), falling back to natural filename order on ties. */
export function sortPhotos<T extends PhotoLike>(photos: T[], by: 'time' | 'name' = 'time'): T[] {
  return [...photos].sort((a, b) => {
    if (by === 'time' && a.lastModified !== b.lastModified) return a.lastModified - b.lastModified;
    return collator.compare(a.name, b.name);
  });
}

/** Pair consecutive photos. An odd photo at the end becomes a front-only card. */
export function pairPhotos<T extends PhotoLike>(photos: T[]): CardPair<T>[] {
  const out: CardPair<T>[] = [];
  for (let i = 0; i < photos.length; i += 2) {
    out.push({ id: photos[i].id, front: photos[i], back: photos[i + 1] ?? null });
  }
  return out;
}

/** Swap front and back of one card. */
export function swapPair<T extends PhotoLike>(pairs: CardPair<T>[], index: number): CardPair<T>[] {
  const p = pairs[index];
  if (!p || !p.back) return pairs;
  const next = [...pairs];
  next[index] = { ...p, front: p.back, back: p.front };
  return next;
}

/** Split a card into two single-photo cards (front-only each). */
export function unpair<T extends PhotoLike>(pairs: CardPair<T>[], index: number): CardPair<T>[] {
  const p = pairs[index];
  if (!p || !p.back) return pairs;
  const next = [...pairs];
  next.splice(index, 1, { id: p.front.id, front: p.front, back: null }, { id: p.back.id, front: p.back, back: null });
  return next;
}

/** Join a front-only card with the next front-only card (its photo becomes the back). */
export function joinWithNext<T extends PhotoLike>(pairs: CardPair<T>[], index: number): CardPair<T>[] {
  const a = pairs[index], b = pairs[index + 1];
  if (!a || !b || a.back || b.back) return pairs;
  const next = [...pairs];
  next.splice(index, 2, { id: a.id, front: a.front, back: b.front });
  return next;
}

/** Move a card up/down in the list. */
export function movePair<T extends PhotoLike>(pairs: CardPair<T>[], index: number, delta: number): CardPair<T>[] {
  const to = index + delta;
  if (index < 0 || index >= pairs.length || to < 0 || to >= pairs.length) return pairs;
  const next = [...pairs];
  const [p] = next.splice(index, 1);
  next.splice(to, 0, p);
  return next;
}

export function removePair<T extends PhotoLike>(pairs: CardPair<T>[], index: number): CardPair<T>[] {
  return pairs.filter((_, i) => i !== index);
}
