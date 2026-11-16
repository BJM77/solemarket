/**
 * Coin and bullion facts read from a listing, for the Benched Coins filters,
 * sorts, tile titles and badges. Pure and client-safe.
 *
 * New listings from the coins sell form save metal / weight / purity / year /
 * denomination / mint / country / condition / grading fields. Older listings
 * (CoinCam, the first $2 coins) are missing some of them, so every fact falls
 * back to what the title, model or sub-category says, and is left undefined
 * when it can't be worked out (those listings simply don't match that filter).
 */
import { isBullionListing, isCoinListing } from '@/lib/coin-listings';

export const TROY_OZ_GRAMS = 31.1034768;

export type CoinKind = 'coin' | 'bullion' | 'banknote';
export type CoinMetal = 'gold' | 'silver' | 'platinum' | 'palladium' | 'base';
export const PRECIOUS_METALS: readonly CoinMetal[] = ['gold', 'silver', 'platinum', 'palladium'];

export const METAL_LABELS: Record<CoinMetal, string> = {
  gold: 'Gold',
  silver: 'Silver',
  platinum: 'Platinum',
  palladium: 'Palladium',
  base: 'Base metal (copper, bronze, nickel)',
};

/** Loose listing shape: Firestore listings carry many optional fields. */
export type CoinListingLike = {
  id?: string;
  title?: unknown;
  category?: unknown;
  subCategory?: unknown;
  storefrontId?: unknown;
  price?: unknown;
  year?: unknown;
  metal?: unknown;
  weight?: unknown;
  purity?: unknown;
  denomination?: unknown;
  model?: unknown;
  mint?: unknown;
  brand?: unknown;
  country?: unknown;
  condition?: unknown;
  gradingCompany?: unknown;
  grade?: unknown;
  createdAt?: unknown;
  [key: string]: unknown;
};

export interface CoinFacets {
  kind: CoinKind;
  metal?: CoinMetal;
  /** Gross weight in troy ounces. */
  weightOz?: number;
  /** Fineness as a fraction, e.g. 0.9999. */
  purity?: number;
  /** Fine (pure metal) troy ounces = weightOz × purity. */
  fineOz?: number;
  year?: number;
  country?: string;
  mint?: string;
  denomination?: string;
  condition?: string;
  graded: boolean;
  gradingCompany?: string;
  grade?: string;
  /** Numeric part of a Sheldon grade (MS65 -> 65), 1-70. */
  gradeNumber?: number;
  price: number;
  /** Listing time in ms (0 when unknown). */
  createdMs: number;
}

const str = (v: unknown): string => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : typeof v === 'number' && Number.isFinite(v) ? String(v) : '');

export function listingPrice(p: { price?: unknown }): number {
  const n = typeof p.price === 'number' ? p.price : Number(String(p.price ?? '').replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function createdMs(v: unknown): number {
  if (!v) return 0;
  if (typeof v === 'number') return v > 1e12 ? v : v * 1000;
  if (typeof v === 'string') { const t = Date.parse(v); return Number.isNaN(t) ? 0 : t; }
  if (v instanceof Date) return v.getTime();
  const o = v as { seconds?: unknown; _seconds?: unknown; toDate?: () => Date; value?: unknown };
  if (typeof o.toDate === 'function') { try { return o.toDate().getTime(); } catch { return 0; } }
  if (typeof o.seconds === 'number') return o.seconds * 1000;
  if (typeof o._seconds === 'number') return o._seconds * 1000;
  if (typeof o.value === 'string') return createdMs(o.value);
  return 0;
}

/** Metal key from any metal / composition text ("Aluminium Bronze" -> base, ".9999 Gold" -> gold). */
export function parseMetal(text: unknown): CoinMetal | undefined {
  const t = str(text).toLowerCase();
  if (!t) return undefined;
  if (/palladium/.test(t)) return 'palladium';
  if (/platinum/.test(t)) return 'platinum';
  if (/\bgold\b/.test(t)) return 'gold';
  if (/\bsilver\b|sterling/.test(t)) return 'silver';
  if (/copper|bronze|brass|nickel|cupro|alumin|zinc|steel|\biron\b|bi-?metal|\btin\b|pewter|\bbase\b/.test(t)) return 'base';
  return undefined;
}

const WEIGHT_RE = /(\d+\s*\/\s*\d+|\d+(?:\.\d+)?)\s*(troy\s*oz|troy\s*ounces?|oz|ounces?|kg|kilos?|kilograms?|g|grams?|gm)\b/i;

/** Troy ounces from "1 oz", "1/10 oz", "31.1 g", "1kg"; undefined if no weight is given. */
export function parseWeightOz(text: unknown): number | undefined {
  const t = str(text);
  if (!t) return undefined;
  const m = t.match(WEIGHT_RE);
  if (!m) return undefined;
  let n: number;
  if (m[1].includes('/')) {
    const [a, b] = m[1].split('/').map((x) => Number(x.trim()));
    n = b ? a / b : NaN;
  } else n = Number(m[1]);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  const unit = m[2].toLowerCase();
  if (/^k/.test(unit)) return (n * 1000) / TROY_OZ_GRAMS;
  if (/^(g|gm|gram)/.test(unit)) return n / TROY_OZ_GRAMS;
  return n;
}

const MILLESIMAL = new Set(['375', '417', '585', '750', '800', '835', '900', '916', '917', '925', '958', '999', '999.5', '999.9', '9995', '9999']);

/** Fineness as a fraction from ".9999", "99.99%", "999.9", "9999", "22k", "sterling". */
export function parsePurity(text: unknown): number | undefined {
  const t = str(text).toLowerCase();
  if (!t) return undefined;
  if (/sterling/.test(t)) return 0.925;
  const karat = t.match(/\b(\d{1,2})\s*(?:k|kt|ct|carat|karat)\b/);
  if (karat) { const k = Number(karat[1]); if (k > 0 && k <= 24) return Math.round((k / 24) * 10000) / 10000; }
  const pct = t.match(/(\d{1,3}(?:\.\d+)?)\s*%/);
  if (pct) { const n = Number(pct[1]); return n > 0 && n <= 100 ? n / 100 : undefined; }
  const dec = t.match(/(?:^|[^\d])(0?\.\d{2,5})(?!\d)/);
  if (dec) { const n = Number(dec[1]); return n > 0 && n < 1 ? n : undefined; }
  // Millesimal fineness marks only (so "100 years" or "500 mintage" never read as purity).
  for (const m of t.matchAll(/\b(\d{3,4}(?:\.\d)?)\b/g)) {
    const raw = m[1];
    if (MILLESIMAL.has(raw)) return /^\d{4}$/.test(raw) ? Number(raw) / 10000 : Number(raw) / 1000;
  }
  return undefined;
}

export function parseYear(v: unknown, title?: unknown): number | undefined {
  const max = new Date().getFullYear() + 1;
  const n = typeof v === 'number' ? v : Number(str(v));
  if (Number.isInteger(n) && n >= 1 && n <= max) return n;
  const m = str(title).match(/\b(1[5-9]\d\d|20\d\d)\b/);
  if (m) { const y = Number(m[1]); if (y <= max) return y; }
  return undefined;
}

const DENOM_RE = /(\$\s?\d+(?:\.\d+)?|\d+\s?(?:c|cents?)\b|\bhalf\s?(?:penny|sovereign|crown)\b|\b(?:penny|pence|florin|shilling|sixpence|threepence|sovereign|crown|dollar)\b)/i;

/** "$$2" -> "$2", "2 cents" -> "2c"; also reads it from the title. */
export function normaliseDenomination(v: unknown, title?: unknown): string | undefined {
  let d = str(v).replace(/^\$+/, '$');
  if (!d) {
    const m = str(title).match(DENOM_RE);
    d = m ? m[1] : '';
  }
  d = d.replace(/^\$\s+/, '$').replace(/^(\d+)\s?(?:c|cents?)$/i, '$1c');
  if (!d || /^raw$/i.test(d)) return undefined;
  return /^[a-z]/.test(d) ? d.charAt(0).toUpperCase() + d.slice(1) : d;
}

function countryOf(p: CoinListingLike): string | undefined {
  const c = str(p.country);
  if (c) return c;
  const sub = str(p.subCategory).toLowerCase();
  const title = str(p.title);
  if (/\baustralia(n)?\b/i.test(title) || sub === 'australian coins') return 'Australia';
  if (/\bnew zealand\b/i.test(title)) return 'New Zealand';
  if (/\b(united states|usa|u\.s\.|american)\b/i.test(title)) return 'United States';
  if (/\bcanad(a|ian)\b/i.test(title)) return 'Canada';
  if (/\b(united kingdom|britain|british|great britain)\b/i.test(title)) return 'United Kingdom';
  return undefined;
}

const COIN_GRADERS_RE = /^(PCGS|NGC|ANACS|ICG|CGC|PMG)$/i;

/** Every coin fact the filters, sorts, titles and badges need. */
export function coinFacets(p: CoinListingLike): CoinFacets {
  const title = str(p.title);
  const sub = str(p.subCategory);
  const kind: CoinKind = isBullionListing(p) ? 'bullion' : /banknote|bank note/i.test(sub) || /\bbank\s?notes?\b|\bbanknotes?\b/i.test(title) ? 'banknote' : 'coin';
  const condition = str(p.condition);
  const metal = parseMetal(p.metal) ?? parseMetal(condition) ?? (kind === 'bullion' ? parseMetal(sub) : undefined) ?? parseMetal(title);
  const weightOz = parseWeightOz(p.weight) ?? parseWeightOz(title);
  const purity = parsePurity(p.purity) ?? parsePurity(title.replace(/\b(1[5-9]\d\d|20\d\d)\b/g, ' '));
  const fineOz = weightOz && purity && metal && metal !== 'base' ? weightOz * purity : undefined;
  const company = str(p.gradingCompany);
  const grade = str(p.grade);
  const graded = !!company && !/^raw$/i.test(company) && company !== 'Not graded';
  const gradeNum = grade.match(/(\d{1,2})/);
  const gradeNumber = graded && gradeNum ? Number(gradeNum[1]) : undefined;
  return {
    kind,
    metal,
    weightOz,
    purity,
    fineOz,
    year: parseYear(p.year, title),
    country: countryOf(p),
    mint: str(p.mint) || str(p.brand) || undefined,
    denomination: kind === 'bullion' ? (str(p.denomination) || undefined) : normaliseDenomination(p.denomination || p.model, title),
    // Legacy listings stored the metal in condition ("Aluminium Bronze"): only real conditions count.
    condition: condition && !parseMetal(condition) ? condition : undefined,
    graded,
    gradingCompany: graded ? (COIN_GRADERS_RE.test(company) ? company.toUpperCase() : company) : undefined,
    grade: graded && grade ? grade : undefined,
    gradeNumber: gradeNumber && gradeNumber >= 1 && gradeNumber <= 70 ? gradeNumber : undefined,
    price: listingPrice(p),
    createdMs: createdMs(p.createdAt),
  };
}

export { isCoinListing };
