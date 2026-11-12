import { isCardCategory } from '@/lib/constants/marketplace';
import {
  type ListingTitleSource,
  shortListingTitle,
  cleanSpaces,
  pickBrand,
  pickModel,
  pickYear,
  pickPlayer,
  YEAR_RE,
  SHOE_NOISE,
  SHOE_SIZE_US_FIRST,
  SHOE_SIZE_TRAILING,
} from '@/lib/utils/short-listing-title';

/**
 * Fields used to split the desktop listing-page heading into two rows.
 * Extends the shared tile-title source so card set/player/colourway fields
 * can also feed the remainder row. Extra listing fields are ignored.
 */
export type ListingDetailTitleSource = ListingTitleSource;

export type ListingDetailTitle = {
  /** Larger first row, e.g. "2024 Panini" or "Nike Kyrie 7". */
  row1: string;
  /** Remaining title info, or empty when the heading cannot be split. */
  row2: string;
};

const CARD_BRANDS = [
  'Wizards of the Coast',
  'The Pokémon Company',
  'The Pokemon Company',
  'Upper Deck',
  'O-Pee-Chee',
  'O Pee Chee',
  'Pokémon',
  'Pokemon',
  'Panini',
  'Topps',
  'Bowman',
  'Fleer',
  'Leaf',
  'Skybox',
  'SkyBox',
  'Konami',
  'Futera',
  'Donruss',
].sort((a, b) => b.length - a.length);

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function pickColorway(listing: ListingDetailTitleSource): string {
  return cleanSpaces(String(listing.colorway || listing.detectedAttributes?.colorway || ''));
}

function pickSet(listing: ListingDetailTitleSource): string {
  return cleanSpaces(String(listing.set || ''));
}

function formatCardNumber(value?: string | null): string {
  const raw = cleanSpaces(String(value || '')).replace(/^#+/, '');
  return raw ? `#${raw}` : '';
}

function joinParts(parts: Array<string | null | undefined>): string {
  const unique: string[] = [];
  const seen = new Set<string>();
  for (const part of parts) {
    const cleaned = cleanSpaces(part || '');
    if (!cleaned) continue;
    const key = cleaned.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(cleaned);
  }
  return unique.join(' ');
}

function stripWrappingPunctuation(value: string): string {
  let next = cleanSpaces(value);
  // Drop leftover separators and matching quotes around the remainder.
  next = next.replace(/^[-–—,|:;/]+|[-–—,|:;/]+$/g, '').trim();
  next = next.replace(/^['"“”‘’]+|['"“”‘’]+$/g, '').trim();
  next = next.replace(/^[-–—,|:;/]+|[-–—,|:;/]+$/g, '').trim();
  return cleanSpaces(next);
}

/** Remove a phrase once (case-insensitive, word-bounded) from text. */
function removePhrase(text: string, phrase: string): string {
  const cleaned = cleanSpaces(phrase);
  if (!cleaned || !text) return text;
  const pattern = new RegExp(`(?:^|\\s)${escapeRegExp(cleaned)}(?=\\s|$)`, 'i');
  const match = text.match(pattern);
  if (!match) {
    // Fall back to a looser removal when punctuation sits between words.
    const loose = new RegExp(escapeRegExp(cleaned), 'i');
    return cleanSpaces(text.replace(loose, ' '));
  }
  const index = match.index ?? 0;
  const before = text.slice(0, index);
  const after = text.slice(index + match[0].length);
  return cleanSpaces(`${before} ${after}`);
}

function phrasesFromRow1(row1: string): string[] {
  const cleaned = cleanSpaces(row1);
  if (!cleaned) return [];
  const yearMatch = cleaned.match(YEAR_RE);
  if (yearMatch && cleaned.startsWith(yearMatch[1])) {
    const brand = cleanSpaces(cleaned.slice(yearMatch[1].length));
    return [cleaned, yearMatch[1], brand];
  }
  return [cleaned];
}

function remainderAfter(title: string, phrases: string[]): string {
  let rest = title;
  const ordered = [...phrases]
    .map((phrase) => cleanSpaces(phrase))
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);
  for (const phrase of ordered) {
    rest = removePhrase(rest, phrase);
  }
  return stripWrappingPunctuation(rest);
}

function matchLeadingBrand(text: string, brands: string[]): string | null {
  const lower = text.toLowerCase();
  for (const brand of brands) {
    const needle = brand.toLowerCase();
    if (lower === needle || lower.startsWith(`${needle} `)) {
      return text.slice(0, brand.length);
    }
  }
  return null;
}

/**
 * Shoe row 1 reuses the shared tile helper (Brand + Model). If that helper
 * cannot shorten the title, return empty so we fall back to the full title.
 */
function composeShoeRow1(listing: ListingDetailTitleSource, title: string): string {
  const derived = shortListingTitle(listing);
  if (!derived) return '';
  if (title && derived.toLowerCase() === title.toLowerCase()) return '';
  return derived;
}

function composeCardRow1(listing: ListingDetailTitleSource, title: string): string {
  const year = pickYear(listing) || title.match(YEAR_RE)?.[1] || '';
  let brand = pickBrand(listing);
  if (!brand) {
    const withoutYear = year ? removePhrase(title, year) : title;
    brand = matchLeadingBrand(cleanSpaces(withoutYear), CARD_BRANDS) || '';
  }
  if (year && brand) return `${year} ${brand}`;
  return '';
}

function composeCardRow2(listing: ListingDetailTitleSource, title: string, row1: string): string {
  const setOrModel = pickSet(listing) || pickModel(listing);
  const player = pickPlayer(listing);
  const parallel = cleanSpaces(String(listing.parallel || ''));
  const cardNumber = formatCardNumber(listing.cardNumber);
  const row1Phrases = [...phrasesFromRow1(row1), pickYear(listing), pickBrand(listing)];
  const fromFields = remainderAfter(
    joinParts([setOrModel, player, parallel, cardNumber]),
    row1Phrases,
  );
  if (fromFields) return fromFields;
  return remainderAfter(title, row1Phrases);
}

function composeShoeRow2(listing: ListingDetailTitleSource, title: string, row1: string): string {
  const colorway = pickColorway(listing);
  if (colorway && !row1.toLowerCase().includes(colorway.toLowerCase())) {
    return colorway;
  }
  let rest = remainderAfter(title, [row1, pickBrand(listing), pickModel(listing), ...phrasesFromRow1(row1)]);
  rest = rest.replace(SHOE_SIZE_US_FIRST, ' ');
  rest = rest.replace(SHOE_SIZE_TRAILING, ' ');
  rest = rest.replace(SHOE_NOISE, ' ');
  return stripWrappingPunctuation(rest);
}

/**
 * Two-row desktop listing title.
 * Cards: "Year Brand" + remaining set / player / number.
 * Shoes: "Brand Model" (same source as the tile short title) + colourway
 * or remaining edition text.
 * Falls back to the full title on row 1 (and an empty row 2) when a split
 * cannot be derived confidently.
 */
export function listingDetailTitle(listing: ListingDetailTitleSource): ListingDetailTitle {
  const title = cleanSpaces(listing.title || '');
  const isCard = isCardCategory(listing.category ?? undefined);
  const row1 = isCard ? composeCardRow1(listing, title) : composeShoeRow1(listing, title);

  if (!row1) {
    return { row1: title, row2: '' };
  }

  const row2 = isCard
    ? composeCardRow2(listing, title, row1)
    : composeShoeRow2(listing, title, row1);

  if (!row2 || row2.toLowerCase() === row1.toLowerCase()) {
    return { row1, row2: '' };
  }

  return { row1, row2 };
}
