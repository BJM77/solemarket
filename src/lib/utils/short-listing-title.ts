import { isCardCategory } from '@/lib/constants/marketplace';

/** Fields used to build a one-line tile title. Extra listing fields are ignored. */
export type ListingTitleSource = {
  title?: string | null;
  category?: string | null;
  brand?: string | null;
  model?: string | null;
  year?: number | string | null;
  player?: string | null;
  playerName?: string | null;
  manufacturer?: string | null;
  detectedAttributes?: {
    brand?: string | null;
    model?: string | null;
    year?: number | string | null;
  } | null;
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

const SHOE_NOISE = /\b(deadstock|ds|vnds|used|new|bnib|og box|with box|no box|men'?s|women'?s|womens|kids|gs|ps|td|youth|grade school)\b/gi;
// Match "US 11" first so "Kyrie 7 US 11" does not lose the model number to a "7 US" match.
const SHOE_SIZE_US_FIRST = /\b(?:size\s+)?us\s*\d+(?:\.\d+)?(?:y|c|w)?\b/gi;
const SHOE_SIZE_TRAILING = /\bsize\s+\d+(?:\.\d+)?\b|\b\d+(?:\.\d+)?(?:y|c|w)?\s*us\b/gi;

const CARD_SET_WORDS = new Set([
  'panini', 'prizm', 'optic', 'select', 'donruss', 'mosaic', 'topps', 'chrome',
  'upper', 'deck', 'bowman', 'hoops', 'chronicles', 'flux', 'revolution',
  'court', 'kings', 'national', 'treasures', 'flawless', 'immaculate',
  'contenders', 'absolute', 'spectra', 'finest', 'score', 'phoenix', 'nba',
  'football', 'baseball', 'soccer', 'hockey', 'basketball', 'cards', 'card',
  'silver', 'gold', 'holo', 'holofoil', 'refractor', 'parallel', 'prizms',
  'rookie', 'rc', 'auto', 'autograph', 'patch', 'memorabilia', 'graded',
  'psa', 'bgs', 'cgc', 'sgc', 'gem', 'mint', 'raw', 'base',
]);

function cleanSpaces(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function stripQuotes(value: string): string {
  return value.replace(/['"“”‘’][^'"“”‘’]+['"“”‘’]/g, ' ');
}

function pickBrand(listing: ListingTitleSource): string {
  return cleanSpaces(String(listing.brand || listing.detectedAttributes?.brand || ''));
}

function pickModel(listing: ListingTitleSource): string {
  return cleanSpaces(String(listing.model || listing.detectedAttributes?.model || ''));
}

function pickYear(listing: ListingTitleSource): string {
  const raw = listing.year ?? listing.detectedAttributes?.year;
  if (raw === null || raw === undefined || raw === '') return '';
  return String(raw).trim();
}

function pickPlayer(listing: ListingTitleSource): string {
  return cleanSpaces(String(listing.player || listing.playerName || ''));
}

function matchLeadingBrand(text: string): string | null {
  const lower = text.toLowerCase();
  for (const brand of SHOE_BRANDS) {
    if (lower === brand.toLowerCase() || lower.startsWith(`${brand.toLowerCase()} `)) {
      return text.slice(0, brand.length);
    }
  }
  return null;
}

function looksLikeColorway(token: string): boolean {
  return /^(black|white|grey|gray|red|blue|green|yellow|orange|purple|pink|brown|gold|silver|panda|grinch|currency|sisterhood|multicolor|multi)$/i.test(token);
}

function extractShoeModel(rest: string): string {
  const tokens = rest.split(/\s+/).filter(Boolean);
  const keep: string[] = [];
  for (const token of tokens) {
    if (looksLikeColorway(token) && keep.length > 0) break;
    keep.push(token);
    if (keep.length >= 5) break;
  }
  return keep.join(' ');
}

function parseShoeFromTitle(title: string): string {
  let cleaned = stripQuotes(title);
  cleaned = cleaned.replace(SHOE_SIZE_US_FIRST, ' ');
  cleaned = cleaned.replace(SHOE_SIZE_TRAILING, ' ');
  cleaned = cleaned.replace(SHOE_NOISE, ' ');
  cleaned = cleanSpaces(cleaned.replace(/[|/]+/g, ' '));
  if (!cleaned) return title.trim();

  const brand = matchLeadingBrand(cleaned);
  if (!brand) return cleaned;
  const model = extractShoeModel(cleanSpaces(cleaned.slice(brand.length)));
  return model ? `${brand} ${model}` : brand;
}

function shortShoeTitle(listing: ListingTitleSource, title: string): string {
  const brand = pickBrand(listing);
  const model = pickModel(listing);
  if (brand && model) {
    return model.toLowerCase().startsWith(brand.toLowerCase())
      ? model
      : `${brand} ${model}`;
  }
  if (brand && title) {
    const fromTitle = parseShoeFromTitle(title);
    if (fromTitle.toLowerCase().startsWith(brand.toLowerCase())) return fromTitle;
    const rest = extractShoeModel(stripQuotes(fromTitle));
    return rest ? `${brand} ${rest}` : brand;
  }
  return title ? parseShoeFromTitle(title) : '';
}

const YEAR_RE = /\b((?:19|20)\d{2}(?:-\d{2})?)\b/;

function parseCardFromTitle(title: string): string {
  const cleaned = cleanSpaces(stripQuotes(title));
  const yearMatch = cleaned.match(YEAR_RE);
  const year = yearMatch?.[1] || '';
  let rest = year ? cleanSpaces(cleaned.replace(yearMatch![0], ' ')) : cleaned;
  rest = rest.replace(/#\s*\w[\w-]*/g, ' ');
  rest = rest.replace(/\b(?:psa|bgs|cgc|sgc)\s*\d+(?:\.\d+)?\b/gi, ' ');
  rest = rest.replace(/\b\d+\/\d+\b/g, ' ');
  rest = cleanSpaces(rest);

  const playerTokens: string[] = [];
  for (const token of rest.split(/\s+/).filter(Boolean)) {
    const key = token.toLowerCase().replace(/\./g, '');
    if (CARD_SET_WORDS.has(key)) {
      if (playerTokens.length > 0) break;
      continue;
    }
    if (/^\d+$/.test(token)) continue;
    playerTokens.push(token);
    if (playerTokens.length >= 4) break;
  }
  const player = playerTokens.join(' ');
  if (year && player) return `${year} ${player}`;
  return player || year || title.trim();
}

function shortCardTitle(listing: ListingTitleSource, title: string): string {
  const year = pickYear(listing);
  const player = pickPlayer(listing);
  if (year && player) return `${year} ${player}`;
  if (player) {
    const yearFromTitle = title.match(YEAR_RE)?.[1];
    return yearFromTitle ? `${yearFromTitle} ${player}` : player;
  }
  if (title) {
    const parsed = parseCardFromTitle(title);
    if (year && parsed && !parsed.startsWith(year)) return `${year} ${parsed}`;
    return parsed;
  }
  return year;
}

/**
 * One-line tile title: shoes as "Brand + Model", cards as "Year + Player".
 * Falls back to the full listing title when those parts cannot be derived.
 */
export function shortListingTitle(listing: ListingTitleSource): string {
  const title = cleanSpaces(listing.title || '');
  const derived = isCardCategory(listing.category ?? undefined)
    ? shortCardTitle(listing, title)
    : shortShoeTitle(listing, title);
  return derived || title;
}

/** Overlay badge text, e.g. "11.5" or "US 11.5" -> "US11.5". */
export function formatShoeSizeBadge(size?: string | null): string | null {
  if (!size) return null;
  const trimmed = size.trim();
  if (!trimmed) return null;
  const withoutPrefix = trimmed.replace(/^us\s*/i, '').replace(/\s+/g, '');
  if (/^\d/.test(withoutPrefix)) return `US${withoutPrefix}`;
  return trimmed;
}
