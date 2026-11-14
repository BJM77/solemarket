import type { Product } from '@/lib/types';

/** Target <title> length before the site-wide " | Benched" suffix. */
export const LISTING_TITLE_MAX = 55;

const clean = (v: unknown) => String(v ?? '').replace(/\s+/g, ' ').trim();
const fold = (v: string) => v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const tokens = (v: string) => fold(v).split(/[^a-z0-9]+/).filter(Boolean);

/** True when every word of `extra` already appears in `title`. */
function alreadyIn(title: string, extra: string): boolean {
  const have = new Set(tokens(title));
  const want = tokens(extra);
  return want.length > 0 && want.every((t) => have.has(t));
}

/** Cut on a word boundary and add an ellipsis. */
function trimWords(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const space = cut.lastIndexOf(' ');
  return `${(space > max * 0.5 ? cut.slice(0, space) : cut).replace(/[\s,.;:–-]+$/, '')}…`;
}

/**
 * Search title for a listing page: the seller's title plus only the details it
 * doesn't already say (year, card number, slab grade). Raw-condition words and
 * the category suffix are dropped; the root layout appends " | Benched".
 */
export function listingSeoTitle(product: Pick<Product, 'title'> & Partial<Product>): string {
  const title = clean(product.title) || 'Listing';
  const extras: string[] = [];
  const year = clean(product.year);
  if (year && !alreadyIn(title, year)) extras.push(year);
  const set = clean((product as any).set);
  // Short, generic titles ("Chet Holmgren", "Trading Card") benefit from the set/brand.
  const setLike = set || clean(product.brand || product.manufacturer);
  if (setLike && title.length < 30 && !alreadyIn(title, setLike)) extras.push(setLike);
  const num = clean(product.cardNumber).replace(/^#/, '');
  if (num && !alreadyIn(title, num)) extras.push(`#${num}`);
  if (product.gradingCompany && product.gradingCompany !== 'Raw') {
    const grade = clean(`${product.gradingCompany} ${product.grade || ''}`);
    if (!alreadyIn(title, grade)) extras.push(grade);
  }
  const extra = extras.join(' ');
  if (!extra) return trimWords(title, LISTING_TITLE_MAX);
  const full = `${title} – ${extra}`;
  if (full.length <= LISTING_TITLE_MAX) return full;
  // Keep the extras when the title can give up a little room; otherwise the title wins.
  const room = LISTING_TITLE_MAX - extra.length - 3;
  return room >= 25 ? `${trimWords(title, room)} – ${extra}` : trimWords(title, LISTING_TITLE_MAX);
}

/** Manufacturers we can name confidently from a set/brand field. Longest first. */
const MAKERS: Array<[RegExp, string]> = [
  [/^upper deck\b/i, 'Upper Deck'],
  [/^o[- ]pee[- ]chee\b/i, 'O-Pee-Chee'],
  [/^wizards of the coast\b/i, 'Wizards of the Coast'],
  [/^(the )?pok[eé]mon( company)?\b/i, 'Pokémon'],
  [/^panini\b/i, 'Panini'],
  [/^topps\b/i, 'Topps'],
  [/^bowman\b/i, 'Bowman'],
  [/^fleer\b/i, 'Fleer'],
  [/^leaf\b/i, 'Leaf'],
  [/^sky ?box\b/i, 'SkyBox'],
  [/^konami\b/i, 'Konami'],
  [/^futera\b/i, 'Futera'],
  // Panini product lines often entered without the maker.
  [/^(donruss|prizm|select|mosaic|hoops|optic|contenders|national treasures|flawless|immaculate|revolution|chronicles|court kings|spectra|obsidian)\b/i, 'Panini'],
  [/^new balance\b/i, 'New Balance'],
  [/^under armour\b/i, 'Under Armour'],
  [/^(air )?jordan\b/i, 'Jordan'],
  [/^nike\b/i, 'Nike'],
  [/^yeezy\b/i, 'adidas'],
  [/^adidas\b/i, 'adidas'],
  [/^asics\b/i, 'ASICS'],
  [/^puma\b/i, 'Puma'],
  [/^reebok\b/i, 'Reebok'],
  [/^converse\b/i, 'Converse'],
  [/^anta\b/i, 'Anta'],
  [/^li[- ]?ning\b/i, 'Li-Ning'],
];

function makerOf(value: unknown): string | null {
  const v = clean(value).replace(/^\d{4}(-\d{2,4})?\s+/, '');
  if (!v) return null;
  for (const [re, name] of MAKERS) if (re.test(v)) return name;
  return null;
}

/**
 * Brand for Product schema: the maker (Panini, Nike...), never a set name like
 * "Panini Prizm Deep Space". Unknown makers are omitted rather than guessed.
 */
export function schemaBrand(product: Partial<Product>): string | null {
  return makerOf(product.manufacturer) || makerOf(product.brand) || makerOf((product as any).set) || makerOf(product.title);
}

export type SchemaSeller = { '@type': 'Organization' | 'Person'; name: string; url?: string };

/** Offer seller for Product schema from the public seller profile; null when there's no usable name. */
export function schemaSeller(seller: Record<string, any> | null | undefined, siteUrl: string, sellerId?: string): SchemaSeller | null {
  if (!seller) return null;
  const store = clean(seller.storeName || seller.businessName);
  const name = store || clean(seller.displayName);
  if (!name || /^(unknown seller|anonymous|admin)$/i.test(name)) return null;
  return {
    '@type': store || seller.isBusiness || seller.accountType === 'business' ? 'Organization' : 'Person',
    name,
    ...(sellerId ? { url: `${siteUrl}/seller/${sellerId}` } : {}),
  };
}
