import { coinListingClassification, type CoinSubCategory } from '@/lib/coin-listings';

export const COIN_METALS = ['Gold', 'Silver', 'Platinum', 'Palladium', 'Copper', 'Bronze', 'Aluminium Bronze', 'Cupronickel', 'Nickel', 'Bi-metallic', 'Other'];
export const COIN_CONDITIONS = ['Uncirculated', 'Circulated', 'Proof', 'Brilliant Uncirculated', 'Carded / In Pack', 'Damaged / Holed'];
export const COIN_GRADERS = ['Raw', 'PCGS', 'NGC', 'ANACS', 'ICG', 'Other'];
const BULLION_METALS = ['Gold', 'Silver', 'Platinum', 'Palladium'];

export interface CoinFormValues {
  kind: 'coin' | 'bullion';
  subCategory: CoinSubCategory;
  title: string;
  year: string;
  denomination: string;
  country: string;
  mint: string;
  metal: string;
  weight: string;
  purity: string;
  condition: string;
  gradingCompany: string;
  grade: string;
  certNumber: string;
  price: string;
  quantity: string;
  description: string;
  allowLocalPickup: boolean;
}

/** Listing fields saved for a coin/bullion listing (passed to saveDraftListing). */
export interface CoinListingData {
  title: string;
  description: string;
  price: number;
  quantity: number;
  category: 'Coins' | 'Bullion';
  subCategory: CoinSubCategory;
  storefrontId: 'coins';
  condition: string;
  year?: number;
  denomination?: string;
  country?: string;
  mint?: string;
  /** Mint is also saved as brand so existing cards, search and SEO show it. */
  brand?: string;
  metal?: string;
  weight?: string;
  purity?: string;
  gradingCompany: string;
  grade?: string;
  certNumber?: string;
  allowLocalPickup: boolean;
  acceptsPayId: true;
  isNegotiable: boolean;
  isReverseBidding: false;
  autoRepricingEnabled: false;
  isVault: false;
}

const clean = (s: string) => s.replace(/\s+/g, ' ').trim();

/** Validate the coins sell form and build the listing. Pure, so it is unit tested. */
export function buildCoinListingData(v: CoinFormValues): { data: CoinListingData | null; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const title = clean(v.title);
  if (title.length < 3) errors.title = 'Add a title (at least 3 characters).';
  if (title.length > 140) errors.title = 'Keep the title under 140 characters.';

  const price = Number(String(v.price).replace(/[$,\s]/g, ''));
  if (!(price > 0)) errors.price = 'Set a price above $0.';
  else if (price > 100000) errors.price = 'Prices above $100,000 can’t be listed.';

  const quantity = Number(v.quantity || 1);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 999) errors.quantity = 'Quantity must be a whole number from 1 to 999.';

  let year: number | undefined;
  if (clean(v.year)) {
    year = Number(clean(v.year));
    if (!Number.isInteger(year) || year < 1 || year > new Date().getFullYear() + 1) errors.year = 'Enter a year like 1930.';
  }

  const isBullion = v.kind === 'bullion';
  const metal = clean(v.metal);
  if (isBullion && !BULLION_METALS.includes(metal)) errors.metal = 'Choose gold, silver, platinum or palladium.';
  if (isBullion && !clean(v.weight)) errors.weight = 'Add the weight (e.g. 1 oz).';
  if (v.gradingCompany !== 'Raw' && !clean(v.grade)) errors.grade = 'Add the grade shown on the slab.';

  if (Object.keys(errors).length) return { data: null, errors };

  const cls = coinListingClassification({ subCategory: v.subCategory, title, metal, country: v.country, isBullion });
  const opt = (s: string) => (clean(s) ? clean(s) : undefined);
  const data: CoinListingData = {
    title,
    description: v.description.trim(),
    price: Math.round(price * 100) / 100,
    quantity,
    category: cls.category,
    subCategory: cls.subCategory,
    storefrontId: cls.storefrontId,
    condition: v.condition || 'Circulated',
    year,
    denomination: opt(v.denomination),
    country: opt(v.country),
    mint: opt(v.mint),
    brand: opt(v.mint),
    metal: metal || undefined,
    weight: opt(v.weight),
    purity: opt(v.purity),
    gradingCompany: v.gradingCompany || 'Raw',
    grade: v.gradingCompany !== 'Raw' ? opt(v.grade) : undefined,
    certNumber: v.gradingCompany !== 'Raw' ? opt(v.certNumber) : undefined,
    allowLocalPickup: v.allowLocalPickup,
    acceptsPayId: true,
    isNegotiable: true,
    isReverseBidding: false,
    autoRepricingEnabled: false,
    isVault: false,
  };
  // Drop undefined so Firestore never sees them.
  for (const k of Object.keys(data) as (keyof CoinListingData)[]) if (data[k] === undefined) delete data[k];
  return { data, errors };
}
