import { isCardCategory } from '@/lib/constants/marketplace';

/**
 * Fields used to split the desktop listing-page heading into two rows.
 * Extra listing fields are ignored. `player`, `set` and `parallel` are often
 * present on card documents even when they are not on the Product type.
 */
export type ListingDetailTitleSource = {
  title?: string | null;
  category?: string | null;
  brand?: string | null;
  manufacturer?: string | null;
  model?: string | null;
  year?: number | string | null;
  player?: string | null;
  playerName?: string | null;
  set?: string | null;
  cardNumber?: string | null;
  colorway?: string | null;
  parallel?: string | null;
  detectedAttributes?: {
    brand?: string | null;
    model?: string | null;
    year?: number | string | null;
    colorway?: string | null;
  } | null;
};

export type ListingDetailTitle = {
  /** Larger first row, e.g. "2024 Panini" or "Nike Kyrie 7". */
  row1: string;
  /** Remaining title info, or empty when the heading cannot be split. */
  row2: string;
};

const SHOE_BRANDS = [
  'Air Jordan',
  'New Balance',
  'Under Armour',
  'Alexander McQueen',
  'The North Face',
  'Nike',
  'Jordan',
  'Adidas',
  'Yeezy',
  'Puma',
  'Reebok',
  'Asics',
  'Converse',
  'Vans',
  'Saucony',
  'Hoka',
  'Salomon',
  'Crocs',
  'Timberland',
  'Ugg',
].sort((a, b) => b.length - a.length);

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

const SHOE_NOISE = /\b(deadstock|ds|vnds|used|new|bnib|og box|with box|no box|men'?s|women'?s|womens|kids|gs|ps|td|youth|grade school)\b/gi;
const SHOE_SIZE_US_FIRST = /\b(?:size\s+)?us\s*\d+(?:\.\d+)?(?:y|c|w)?\b/gi;
const SHOE_SIZE_TRAILING = /\bsize\s+\d+(?:\.\d+)?\b|\b\d+(?:\.\d+)?(?:y|c|w)?\s*us\b/gi;
const YEAR_RE = /\b((?:19|20)\d{2}(?:-\d{2})?)\b/;

function cleanSpaces(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function pickBrand(listing: ListingDetailTitleSource): string {
  return cleanSpaces(String(
    listing.brand || listing.manufacturer || listing.detectedAttributes?.brand || '',
  ));
}

function pickModel(listing: ListingDetailTitleSource): string {
  return cleanSpaces(String(listing.model || listing.detectedAttributes?.model || ''));
}

function pickYear(listing: ListingDetailTitleSource): string {
  const raw = listing.year ?? listing.detectedAttributes?.year;
  if (raw === null || raw === undefined || raw === '') return '';
  return String(raw).trim();
}

function pickPlayer(listing: ListingDetailTitleSource): string {
  return cleanSpaces(String(listing.player || listing.playerName || ''));
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

function looksLikeColorway(token: string): boolean {
  return /^(black|white|grey|gray|red|blue|green|yellow|orange|purple|pink|brown|gold|silver|panda|grinch|currency|sisterhood|multicolor|multi)$/i.test(token);
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

function extractQuotedPhrase(text: string): string | null {
  const match = text.match(/['"“”‘’]([^'"“”‘’]+)['"“”‘’]/);
  const phrase = cleanSpaces(match?.[1] || '');
  return phrase || null;
}

function extractShoeModel(rest: string): string {
  const quoted = extractQuotedPhrase(rest);
  const beforeQuote = quoted
    ? cleanSpaces(rest.slice(0, rest.search(/['"“”‘’]/)))
    : rest;
  const cutAtDash = beforeQuote.split(/\s+[-–—]\s+/)[0];
  const tokens = cleanSpaces(cutAtDash).split(/\s+/).filter(Boolean);
  const keep: string[] = [];
  for (const token of tokens) {
    if (looksLikeColorway(token) && keep.length > 0) break;
    keep.push(token);
    if (keep.length >= 5) break;
  }
  return keep.join(' ');
}

function withBrandAndModel(brand: string, model: string): string {
  if (!brand) return model;
  if (!model) return brand;
  return model.toLowerCase().startsWith(brand.toLowerCase())
    ? model
    : `${brand} ${model}`;
}

function composeShoeRow1(listing: ListingDetailTitleSource, title: string): string {
  const brand = pickBrand(listing);
  const model = pickModel(listing);
  if (brand && model) return withBrandAndModel(brand, model);

  let cleaned = title;
  cleaned = cleaned.replace(SHOE_SIZE_US_FIRST, ' ');
  cleaned = cleaned.replace(SHOE_SIZE_TRAILING, ' ');
  cleaned = cleaned.replace(SHOE_NOISE, ' ');
  cleaned = cleanSpaces(cleaned.replace(/[|/]+/g, ' '));

  const parsedBrand = brand || matchLeadingBrand(cleaned || title, SHOE_BRANDS) || '';
  if (!parsedBrand) return '';

  const afterBrand = cleanSpaces(
    (cleaned || title).slice(
      (cleaned || title).toLowerCase().indexOf(parsedBrand.toLowerCase()) + parsedBrand.length,
    ),
  );
  const parsedModel = model || extractShoeModel(afterBrand);
  return parsedModel ? withBrandAndModel(parsedBrand, parsedModel) : '';
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
 * Shoes: "Brand Model" + colourway or remaining edition text.
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
