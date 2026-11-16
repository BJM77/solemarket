/**
 * Benched Coins listing text: one-line tile titles, the two-row listing
 * heading and the tile corner badge. Pure, client-safe and unit tested.
 */
import { coinFacets, METAL_LABELS, TROY_OZ_GRAMS, type CoinFacets, type CoinListingLike } from './facets';

const cleanSpaces = (s: string) => s.replace(/\s+/g, ' ').trim();
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Remove a phrase once, case-insensitively, on word-ish boundaries. */
function removePhrase(text: string, phrase: string | undefined): string {
  const p = cleanSpaces(phrase || '');
  if (!p) return text;
  const re = new RegExp(`(^|[\\s,(\\-–—])${escapeRe(p)}(?=$|[\\s,)\\-–—:])`, 'i');
  return cleanSpaces(text.replace(re, '$1'));
}

function tidy(s: string): string {
  return cleanSpaces(s)
    .replace(/^[\s,–—:|/-]+|[\s,–—:|/-]+$/g, '')
    .replace(/\(\s*\)/g, '')
    .trim();
}

const COUNTRY_WORDS: Record<string, string[]> = {
  australia: ['Australian', 'Australia'],
  'new zealand': ['New Zealand'],
  'united states': ['United States', 'USA', 'American'],
  canada: ['Canadian', 'Canada'],
  'united kingdom': ['United Kingdom', 'Great Britain', 'British'],
};

function countryWords(country?: string): string[] {
  if (!country) return [];
  return [...(COUNTRY_WORDS[country.trim().toLowerCase()] || []), country];
}

/** Compact weight for badges: "1 oz", "1/10 oz", "1 kg", "50 g". Uses the seller's text when short. */
export function weightLabel(raw: unknown, oz?: number): string | undefined {
  const s = typeof raw === 'string' ? cleanSpaces(raw) : '';
  if (s && s.length <= 10) return s.replace(/\s*(oz|g|kg)$/i, (m) => ` ${m.trim().toLowerCase()}`).replace(/^(\d)\s+/, '$1 ').replace(/\s+/g, ' ');
  if (!oz) return undefined;
  const fractions: [number, string][] = [[0.05, '1/20'], [0.1, '1/10'], [0.25, '1/4'], [0.5, '1/2']];
  for (const [v, l] of fractions) if (Math.abs(oz - v) < 0.005) return `${l} oz`;
  const grams = oz * TROY_OZ_GRAMS;
  if (Math.abs(grams - 1000) < 5) return '1 kg';
  if (Math.abs(oz - Math.round(oz)) < 0.02) return `${Math.round(oz)} oz`;
  return `${Math.round(grams * 10) / 10} g`;
}

const FILLER = /\b(coin|coins|carded|card|in card|bullion|round)\b/gi;

/** What's left of the title once the facts shown elsewhere are taken out. */
function titleRemainder(title: string, facets: CoinFacets, opts: { dropCountry?: boolean; dropDenomination?: boolean; dropWeight?: boolean; dropFiller?: boolean }): string {
  let rest = cleanSpaces(title);
  if (facets.year) rest = removePhrase(rest, String(facets.year));
  // Only a leading country ("2023 Australian $2 ...") is dropped; "Team Australia" stays.
  if (opts.dropCountry) {
    for (const w of countryWords(facets.country)) {
      const lead = new RegExp(`^${escapeRe(w)}(?=$|[\\s,:\\-–—])`, 'i');
      if (lead.test(rest)) { rest = tidy(rest.replace(lead, '')); break; }
    }
  }
  if (opts.dropDenomination && facets.denomination) {
    rest = removePhrase(rest, facets.denomination);
    // "1 penny" vs a title saying "Penny": drop the word too.
    for (const word of facets.denomination.split(/\s+/)) if (/^[a-z]{3,}$/i.test(word)) rest = removePhrase(rest, word);
  }
  if (opts.dropWeight) rest = cleanSpaces(rest.replace(/(\d+\s*\/\s*\d+|\d+(?:\.\d+)?)\s*(troy\s*oz|oz|ounces?|kg|g|grams?)\b/i, ' '));
  if (opts.dropFiller) rest = cleanSpaces(rest.replace(FILLER, ' '));
  return tidy(rest);
}

/**
 * One-line tile title. Coins: year + denomination + name ("2023 $2 Vietnam War 50th Anniversary").
 * Bullion: year + weight + name ("2024 1 oz Perth Mint Kangaroo Gold"). Falls back to the title.
 */
export function coinTileTitle(p: CoinListingLike, facets: CoinFacets = coinFacets(p)): string {
  const title = cleanSpaces(typeof p.title === 'string' ? p.title : '');
  if (!title) return '';
  if (facets.kind === 'bullion') {
    const w = weightLabel(p.weight, facets.weightOz);
    const rest = titleRemainder(title, facets, { dropWeight: !!w });
    return cleanSpaces([facets.year, w, rest].filter(Boolean).join(' ')) || title;
  }
  const rest = titleRemainder(title, facets, { dropCountry: true, dropDenomination: !!facets.denomination, dropFiller: true });
  const out = cleanSpaces([facets.year, facets.denomination, rest].filter(Boolean).join(' '));
  return out || title;
}

/**
 * Two-row listing heading. Row 1: year + country (or mint), e.g. "2023 Australia".
 * Row 2: the rest of the title. Falls back to the whole title on row 1.
 */
export function coinTitleRows(p: CoinListingLike, facets: CoinFacets = coinFacets(p)): { row1: string; row2: string } {
  const title = cleanSpaces(typeof p.title === 'string' ? p.title : '');
  const place = facets.country || facets.mint;
  if (!facets.year || !place) return { row1: title, row2: '' };
  const row1 = `${facets.year} ${place}`;
  let rest = titleRemainder(title, facets, { dropCountry: !!facets.country });
  if (!facets.country && facets.mint) rest = tidy(removePhrase(rest, facets.mint));
  if (!rest || rest.toLowerCase() === row1.toLowerCase()) return { row1, row2: '' };
  return { row1, row2: rest };
}

/**
 * Tile corner badge: graded coins show the slab ("PCGS MS65"), bullion its weight and metal ("1 oz Gold").
 * Raw coins have no badge.
 */
export function coinTileBadge(p: CoinListingLike, facets: CoinFacets = coinFacets(p)): string | null {
  if (facets.graded && facets.gradingCompany) return cleanSpaces(`${facets.gradingCompany} ${facets.grade || ''}`);
  if (facets.kind === 'bullion') {
    const w = weightLabel(p.weight, facets.weightOz);
    const metal = facets.metal && facets.metal !== 'base' ? METAL_LABELS[facets.metal] : '';
    const label = cleanSpaces([w, metal].filter(Boolean).join(' '));
    return label || null;
  }
  return null;
}

/** Spec rows for a coin listing page (only facts the listing has). */
export function coinSpecRows(p: CoinListingLike, facets: CoinFacets = coinFacets(p)): { label: string; value: string; href?: string }[] {
  const q = (k: string, v: string | number) => `/coins/browse?${new URLSearchParams({ [k]: String(v) }).toString()}`;
  const rows: { label: string; value: string; href?: string }[] = [];
  const typeLabel = facets.kind === 'bullion' ? 'Bullion' : facets.kind === 'banknote' ? 'Banknote' : 'Coin';
  const typeParam = facets.kind === 'bullion' ? 'bullion' : facets.kind === 'banknote' ? 'banknotes' : 'coins';
  rows.push({ label: 'Type', value: typeLabel, href: q('coinType', typeParam) });
  if (typeof p.subCategory === 'string' && p.subCategory) rows.push({ label: 'Category', value: p.subCategory, href: q('subCategory', p.subCategory) });
  if (facets.metal) rows.push({ label: 'Metal', value: typeof p.metal === 'string' && p.metal ? p.metal : METAL_LABELS[facets.metal], href: q('metal', facets.metal) });
  const w = weightLabel(p.weight, facets.weightOz);
  if (w) rows.push({ label: 'Weight', value: w });
  if (facets.purity) rows.push({ label: 'Purity', value: typeof p.purity === 'string' && p.purity ? p.purity : String(facets.purity) });
  if (facets.year) rows.push({ label: 'Year', value: String(facets.year), href: `/coins/browse?yearMin=${facets.year}&yearMax=${facets.year}` });
  if (facets.denomination) rows.push({ label: 'Denomination', value: facets.denomination, href: q('denomination', facets.denomination) });
  if (facets.mint) rows.push({ label: 'Mint / refiner', value: facets.mint, href: q('mint', facets.mint) });
  if (facets.country) rows.push({ label: 'Country', value: facets.country, href: q('country', facets.country) });
  if (facets.condition) rows.push({ label: 'Condition', value: facets.condition });
  rows.push(facets.graded
    ? { label: 'Grading', value: cleanSpaces(`${facets.gradingCompany || ''} ${facets.grade || ''}`), href: q('graded', 'graded') }
    : { label: 'Grading', value: 'Not graded (raw)' });
  if (facets.graded && typeof p.certNumber === 'string' && p.certNumber) rows.push({ label: 'Cert number', value: p.certNumber });
  return rows;
}
