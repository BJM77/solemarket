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

export function getProductUrl(product: {
  id: string;
  title: string;
  category?: string;
  subCategory?: unknown;
  storefrontId?: unknown;
  brand?: string;
  size?: string;
}): string {
  let section = 'shoes';
  // Coins and bullion live on the coins storefront (/coins/..., coins.benched.au/...).
  if (isCoinCategory(product.category) || isCoinListing(product)) {
    section = 'coins';
  } else if (isCardCategory(product.category)) {
    section = 'cards';
  }
  let baseTitle = product.title || 'item';
  if (section === 'shoes') {
    const brand = String(product.brand ?? '').trim();
    if (brand && !baseTitle.toLowerCase().includes(brand.toLowerCase())) {
      baseTitle = `${brand} ${baseTitle}`;
    }
    const sizeRaw = String(product.size ?? '').trim();
    if (sizeRaw && !/\b(size|us\s*\d|uk\s*\d|eu\s*\d)\b/i.test(baseTitle)) {
      const sizeSlug = /^(us|uk|eu)/i.test(sizeRaw) ? sizeRaw : `us${sizeRaw}`;
      baseTitle = `${baseTitle} ${sizeSlug}`;
    }
  }
  const slug = slugify(baseTitle);
  return `/${section}/${slug}/${product.id}`;
}
