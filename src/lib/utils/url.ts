import { isCardCategory, isCoinCategory } from "@/lib/constants/marketplace";
import { isCoinListing } from "@/lib/coin-listings";

export function slugify(text: string): string {
  const slug = text
    .toString()
    .normalize('NFKD') // split accented letters, e.g. "é" -> "e" + combining accent
    .replace(/[\u0300-\u036f]/g, '') // drop the accents so "Pokémon" -> "pokemon", not "pokmon"
    .toLowerCase()
    .trim()
    .replace(/&/g, '-and-')
    .replace(/[\/\\|]+/g, '-') // Separators like #108/160 -> 108-160, not 108160
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w-]+/g, '') // Remove all non-word chars
    .replace(/--+/g, '-') // Replace multiple - with single -
    .replace(/^-+|-+$/g, ''); // No leading/trailing -
  // Never return an empty path segment (e.g. titles written only in non-Latin script).
  return slug || 'item';
}

export function getProductUrl(product: { id: string; title: string; category?: string; subCategory?: unknown; storefrontId?: unknown }): string {
  let section = 'shoes';
  // Coins and bullion live on the coins storefront (/coins/..., coins.benched.au/...).
  if (isCoinCategory(product.category) || isCoinListing(product)) {
    section = 'coins';
  } else if (isCardCategory(product.category)) {
    section = 'cards';
  }
  const slug = slugify(product.title);
  return `/${section}/${slug}/${product.id}`;
}
