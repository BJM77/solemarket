import { isCardCategory, isCoinCategory } from "@/lib/constants/marketplace";

export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w-]+/g, '') // Remove all non-word chars
    .replace(/--+/g, '-'); // Replace multiple - with single -
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
