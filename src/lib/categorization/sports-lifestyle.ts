import type { Product } from '@/lib/types';
import { isCardCategory } from '@/lib/constants/marketplace';

const BASKETBALL_SNEAKER_KEYWORDS = [
  'jordan',
  'kobe',
  'lebron',
  'curry',
  'kd',
  'kevin durant',
  'kyrie',
  'freak',
  'giannis',
  'harden',
  'dame',
  'damian lillard',
  't-mac',
  'ja morant',
  'ja 1',
  'ja 2',
  'luka',
  'zion',
  'tatum',
  'booker',
  'book 1',
  'ae 1',
  'anthony edwards',
  'dunk',
  'air force',
  'foamposite',
  'uptempo',
  'hyperdunk',
  'gt cut',
  'g.t. cut',
  'gt jump',
  'gt hustle',
  'cosmic unity',
  'zoom freak',
  'why not',
  'wade',
  'way of wade',
  'all star',
  'pro bounce',
  'hardwood',
  'hoop',
  'basketball',
];

/**
 * Returns true if a sneaker listing is basketball-specific (Jordan retro, signature player shoes, on-court performance).
 * If false, it's non-basketball / lifestyle footwear (e.g. Stan Smith, Samba, 550, Air Max, runners).
 */
export function isBasketballSneaker(p: Product): boolean {
  if (isCardCategory(p.category)) return false;
  const brand = (p.brand || '').toLowerCase();
  if (brand === 'jordan') return true;
  const text = `${p.title} ${p.subCategory || ''} ${p.model || ''} ${p.description || ''}`.toLowerCase();
  return BASKETBALL_SNEAKER_KEYWORDS.some((kw) => text.includes(kw));
}

const OTHER_SPORTS_KEYWORDS = [
  'soccer',
  'football',
  'baseball',
  'hockey',
  'ufc',
  'wwe',
  'f1',
  'formula 1',
  'cricket',
  'rugby',
  'afl',
  'nrl',
  'golf',
  'tennis',
  'nfl',
];

/**
 * Checks if a card listing is another sport (soccer, baseball, NFL, etc.) so it can be kept low-key
 * with a subtle tag on the basketball-primary marketplace.
 */
export function isNonBasketballSportCard(p: Product): boolean {
  if (!isCardCategory(p.category)) return false;
  const text = `${p.title} ${p.subCategory || ''} ${p.description || ''}`.toLowerCase();
  return OTHER_SPORTS_KEYWORDS.some((kw) => text.includes(kw));
}
