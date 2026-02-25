
/**
 * Marketplace-wide constants for categories, conditions, and sub-categories.
 * Standardizing these ensures consistent SEO, URLs, and data structure across the platform.
 */

export const CATEGORY_TRADING_CARDS = 'Trading Cards';
export const CATEGORY_SNEAKERS = 'Sneakers';
export const CATEGORY_ACCESSORIES = 'Accessories';
export const CATEGORY_GENERAL = 'General';

export const DEFAULT_CATEGORIES = [
  CATEGORY_SNEAKERS,
  CATEGORY_ACCESSORIES,
  CATEGORY_TRADING_CARDS,
  CATEGORY_GENERAL
];

export const DEFAULT_SUB_CATEGORIES: Record<string, string[]> = {
  [CATEGORY_SNEAKERS]: ['Jordan', 'Nike', 'Adidas', 'Yeezy', 'New Balance', 'Other'],
  [CATEGORY_ACCESSORIES]: ['Watches', 'Bags', 'Hats', 'Jewelry', 'Other'],
  [CATEGORY_TRADING_CARDS]: ['Basketball Cards', 'Sports Cards', 'Trading Cards', 'Pokémon', 'Yu-Gi-Oh!', 'Other'],
  [CATEGORY_GENERAL]: ['Household', 'Electronics', 'Clothing', 'Books', 'Other']
};

export const DEFAULT_CONDITIONS = [
  'New',
  'Used',
  'Mint',
  'Near Mint',
  'Excellent',
  'Good',
  'Fair'
];

/**
 * Mapping for normalizing legacy or inconsistent category strings.
 */
export const CATEGORY_MAPPING: Record<string, string> = {
  'Cards': CATEGORY_TRADING_CARDS,
  'Collector Cards': CATEGORY_TRADING_CARDS,
  'collector-cards': CATEGORY_TRADING_CARDS,
  'trading-cards': CATEGORY_TRADING_CARDS,
  'Shoes': CATEGORY_SNEAKERS,
  'shoes': CATEGORY_SNEAKERS,
  'sneakers': CATEGORY_SNEAKERS,
};

/**
 * Normalizes a category string to the canonical version.
 */
export function normalizeCategory(category?: string): string {
  if (!category) return CATEGORY_GENERAL;
  return CATEGORY_MAPPING[category] || category;
}

/**
 * Checks if a category is a card category.
 */
export function isCardCategory(category?: string): boolean {
  const normalized = normalizeCategory(category);
  return normalized === CATEGORY_TRADING_CARDS;
}
