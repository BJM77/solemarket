export interface CardRoomItem {
  id: string;
  name: string;
  logo?: string;
  iconName?: string;
  href: string;
  color?: string;
}

/** Desktop Card Room is 2 rows of 5. */
export const CARD_ROOM_COUNT = 10;

/**
 * Default "The Card Room" tiles on the basketball homepage.
 * TCG (Pokémon, Yu-Gi-Oh, etc.) belongs on /pokemon, not here.
 */
export const DEFAULT_CARD_ROOM_ITEMS: CardRoomItem[] = [
  { id: 'c1', name: 'Jordan', logo: '/brand-logos/svg/jordan.svg', href: '/cards?subCategory=Jordan', color: 'bg-red-50/50 dark:bg-red-950/10' },
  { id: 'c2', name: 'Kobe', logo: '/brand-logos/svg/kobe.svg', href: '/cards?subCategory=Kobe', color: 'bg-purple-50/50 dark:bg-purple-950/10' },
  { id: 'c3', name: 'Curry', logo: '/brand-logos/svg/curry.svg', href: '/cards?subCategory=Curry', color: 'bg-orange-50/50 dark:bg-orange-950/10' },
  { id: 'c4', name: 'Rookies', iconName: 'Zap', href: '/cards?subCategory=Rookies', color: 'bg-yellow-50 dark:bg-yellow-950/20' },
  { id: 'c5', name: 'Top 100', iconName: 'Medal', href: '/cards?subCategory=Top%20100', color: 'bg-orange-50 dark:bg-orange-950/20' },
  { id: 'c6', name: 'Wembanyama', iconName: 'Trophy', href: '/cards?subCategory=Wembanyama', color: 'bg-emerald-50 dark:bg-emerald-950/20' },
  { id: 'c7', name: 'Signed', iconName: 'Signature', href: '/cards?subCategory=Signed', color: 'bg-emerald-50 dark:bg-emerald-950/20' },
  { id: 'c8', name: 'Prizm', iconName: 'Sparkles', href: '/cards?q=Prizm', color: 'bg-violet-50 dark:bg-violet-950/20' },
  { id: 'c9', name: 'Under $50', iconName: 'CircleDollarSign', href: '/cards?priceRange=0-50', color: 'bg-green-50 dark:bg-green-950/20' },
  { id: 'c10', name: 'Panini', iconName: 'Layers', href: '/cards?q=Panini', color: 'bg-sky-50 dark:bg-sky-950/20' },
];

function normName(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * Keep any published tiles, then append missing defaults so the grid can fill
 * 2 rows of 5 even when Firestore still has the older 6-item Card Room.
 * Does not truncate a longer admin-curated list.
 */
export function completeCardRoomItems<T extends { name: string; href: string }>(
  items: T[] | undefined,
  defaults: readonly T[] = DEFAULT_CARD_ROOM_ITEMS as unknown as T[],
  count = CARD_ROOM_COUNT,
): T[] {
  const current = items && items.length ? [...items] : [];
  const names = new Set(current.map((i) => normName(i.name)));
  for (const d of defaults) {
    if (current.length >= count) break;
    if (names.has(normName(d.name))) continue;
    current.push(d);
    names.add(normName(d.name));
  }
  return current;
}
