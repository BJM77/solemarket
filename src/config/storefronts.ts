/**
 * Storefront configuration (multi-storefront Stage 1).
 *
 * One codebase and one Firestore serve several specialist storefronts.
 * The active storefront is chosen from the request hostname. Unknown hosts
 * (localhost, App Hosting preview URLs, benched.au itself) fall back to the
 * default storefront so existing behaviour is unchanged.
 */

export type StorefrontId = 'basketball' | 'coins' | 'pokemon' | 'seller';

export interface StorefrontConfig {
  id: StorefrontId;
  name: string;
  /** Hostnames (lowercase, no port) that load this storefront. */
  hosts: string[];
  /** Canonical origin used for SEO once the domain is live. */
  origin: string;
  tagline: string;
  seo: { title: string; description: string };
  colors: { primary: string; secondary: string };
  /** Listing categories shown on this storefront (matches product.category). */
  categories: string[];
  /** Seller portal: management only, never indexed. */
  isSellerPortal?: boolean;
  /**
   * Path on benched.au where this storefront lives until it moves to its own
   * domain (e.g. /coins). On the storefront's own host, "/" serves this path.
   */
  basePath: string;
  /** Not yet launched: pages still render the default storefront experience. */
  launched: boolean;
}

export const DEFAULT_STOREFRONT_ID: StorefrontId = 'basketball';

export const STOREFRONTS: Record<StorefrontId, StorefrontConfig> = {
  basketball: {
    id: 'basketball',
    basePath: '/',
    name: 'Benched',
    hosts: ['benched.au', 'www.benched.au'],
    origin: 'https://benched.au',
    tagline: "Australia's basketball card and sneaker marketplace",
    seo: {
      title: 'Benched | Basketball Cards & Sneakers Marketplace Australia',
      description: 'Buy and sell NBA trading cards, graded cards, rookies and sneakers from Australian collectors.',
    },
    colors: { primary: '#EA580C', secondary: '#374151' },
    categories: ['Collector Cards', 'Sneakers'],
    launched: true,
  },
  coins: {
    id: 'coins',
    basePath: '/coins',
    name: 'Benched Coins',
    hosts: ['coins.benched.au'],
    origin: 'https://coins.benched.au',
    tagline: 'Coins and bullion from Australian collectors',
    seo: {
      title: 'Benched Coins | Coins & Bullion Marketplace Australia',
      description: 'Buy and sell Australian and international coins, gold and silver bullion, proof sets and collections.',
    },
    colors: { primary: '#B8860B', secondary: '#1F2937' },
    categories: ['Coins'],
    launched: false,
  },
  pokemon: {
    id: 'pokemon',
    basePath: '/pokemon',
    name: 'Benched Pokémon',
    hosts: ['pokemon.benched.au'],
    origin: 'https://pokemon.benched.au',
    tagline: 'Pokémon and trading cards from Australian collectors',
    seo: {
      title: 'Benched Pokémon | Pokémon & TCG Marketplace Australia',
      description: 'Buy and sell Pokémon cards, graded cards, sealed product and other trading card games.',
    },
    colors: { primary: '#DC2626', secondary: '#1E3A8A' },
    categories: ['Collector Cards'],
    launched: false,
  },
  seller: {
    id: 'seller',
    basePath: '/sellers',
    name: 'Benched Seller Hub',
    hosts: ['seller.benched.au'],
    origin: 'https://seller.benched.au',
    tagline: 'Manage and upload your listings across every Benched storefront',
    seo: {
      title: 'Benched Seller Hub',
      description: 'Seller tools for Benched marketplaces.',
    },
    colors: { primary: '#EA580C', secondary: '#111827' },
    categories: [],
    isSellerPortal: true,
    launched: false,
  },
};

export const STOREFRONT_HEADER = 'x-storefront';

/** Normalise a Host header value: lowercase, strip port and trailing dot. */
export function normaliseHost(host: string | null | undefined): string {
  return (host || '').trim().toLowerCase().replace(/:\d+$/, '').replace(/\.$/, '');
}

export function resolveStorefrontId(host: string | null | undefined): StorefrontId {
  const h = normaliseHost(host);
  if (!h) return DEFAULT_STOREFRONT_ID;
  for (const sf of Object.values(STOREFRONTS)) {
    if (sf.hosts.includes(h)) return sf.id;
  }
  return DEFAULT_STOREFRONT_ID;
}

export function getStorefrontConfig(id: string | null | undefined): StorefrontConfig {
  return (id && (STOREFRONTS as Record<string, StorefrontConfig>)[id]) || STOREFRONTS[DEFAULT_STOREFRONT_ID];
}

export function resolveStorefront(host: string | null | undefined): StorefrontConfig {
  return STOREFRONTS[resolveStorefrontId(host)];
}

/**
 * For a storefront on its own host, the internal path its homepage maps to.
 * Returns null when no rewrite is needed (default storefront or non-root path).
 */
export function storefrontRootRewrite(host: string | null | undefined, pathname: string): string | null {
  if (pathname !== '/') return null;
  const sf = resolveStorefront(host);
  if (sf.id === DEFAULT_STOREFRONT_ID || sf.basePath === '/') return null;
  return sf.basePath;
}
