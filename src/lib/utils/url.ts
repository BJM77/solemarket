import { isCardCategory, isCoinCategory } from "@/lib/constants/marketplace";

export function slugify(text: string): string {
  const slug = text
    .toString()
    .normalize('NFKD') // split accented letters, e.g. "é" -> "e" + combining accent
    .replace(/[\u0300-\u036f]/g, '') // drop the accents so "Pokémon" -> "pokemon", not "pokmon"
    .toLowerCase()
    .trim()
    .replace(/&/g, '-and-')
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w-]+/g, '') // Remove all non-word chars
    .replace(/--+/g, '-') // Replace multiple - with single -
    .replace(/^-+|-+$/g, ''); // No leading/trailing -
  // Never return an empty path segment (e.g. titles written only in non-Latin script).
  return slug || 'item';
}

export function getProductUrl(product: { id: string; title: string; category?: string }): string {
  let section = 'shoes';
  if (isCardCategory(product.category)) {
    section = 'cards';
  } else if (isCoinCategory(product.category)) {
    section = 'coins';
  }
  const slug = slugify(product.title);
  return `/${section}/${slug}/${product.id}`;
}
