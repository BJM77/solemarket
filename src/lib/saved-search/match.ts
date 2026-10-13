/** Saved-search criteria and matching (pure, unit tested). */
export interface SavedSearchCriteria {
  q?: string;
  category?: string;
  subCategory?: string;
  brand?: string;
  sizes?: string[];
  conditions?: string[];
  priceRange?: [number, number];
  verifiedOnly?: boolean;
}

export interface MatchableProduct {
  title?: string;
  brand?: string;
  manufacturer?: string;
  category?: string;
  subCategory?: string;
  size?: string | number;
  condition?: string;
  price?: number;
  isVerified?: boolean;
  keywords?: string[];
  status?: string;
}

const norm = (s: unknown) => String(s ?? '').toLowerCase().trim();

/** Every query word must appear in the title/brand/keywords. */
export function matchesSavedSearch(p: MatchableProduct, c: SavedSearchCriteria): boolean {
  if (p.status && p.status !== 'available') return false;
  if (c.category && norm(p.category) !== norm(c.category)) return false;
  if (c.subCategory && norm(p.subCategory) !== norm(c.subCategory)) return false;
  if (c.brand && norm(p.brand) !== norm(c.brand) && norm(p.manufacturer) !== norm(c.brand)) return false;
  if (c.sizes?.length && !c.sizes.map(norm).includes(norm(p.size))) return false;
  if (c.conditions?.length && !c.conditions.map(norm).includes(norm(p.condition))) return false;
  if (c.verifiedOnly && !p.isVerified) return false;
  if (c.priceRange) {
    const price = Number(p.price);
    if (!(price >= c.priceRange[0] && price <= c.priceRange[1])) return false;
  }
  if (c.q && c.q.trim()) {
    const hay = [p.title, p.brand, p.manufacturer, ...(p.keywords || [])].map(norm).join(' ');
    if (!norm(c.q).split(/\s+/).filter(Boolean).every((w) => hay.includes(w))) return false;
  }
  return true;
}

/** Strip unknown keys and clamp values from URL/search params into storable criteria. */
export function sanitizeCriteria(input: Record<string, any>): SavedSearchCriteria {
  const str = (v: any, max = 100) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : undefined);
  const arr = (v: any) => (Array.isArray(v) ? v : typeof v === 'string' && v ? v.split(',') : [])
    .map((x: any) => String(x).trim().slice(0, 40)).filter(Boolean).slice(0, 20);
  const out: SavedSearchCriteria = {
    q: str(input.q, 120),
    category: str(input.category),
    subCategory: str(input.subCategory),
    brand: str(input.brand),
    sizes: arr(input.sizes),
    conditions: arr(input.conditions),
    verifiedOnly: input.verifiedOnly === true || input.verifiedOnly === 'true' || undefined,
  };
  const pr = Array.isArray(input.priceRange) ? input.priceRange : typeof input.priceRange === 'string' ? input.priceRange.split(',') : null;
  if (pr && pr.length === 2 && pr.every((n: any) => !isNaN(Number(n)))) out.priceRange = [Number(pr[0]), Number(pr[1])];
  if (!out.sizes?.length) delete out.sizes;
  if (!out.conditions?.length) delete out.conditions;
  for (const k of Object.keys(out) as (keyof SavedSearchCriteria)[]) if (out[k] === undefined) delete out[k];
  return out;
}

export function describeCriteria(c: SavedSearchCriteria): string {
  const bits = [c.q && `"${c.q}"`, c.brand, c.category, c.subCategory, c.sizes?.length && `size ${c.sizes.join('/')}`,
    c.conditions?.length && c.conditions.join('/'), c.priceRange && `$${c.priceRange[0]}-$${c.priceRange[1]}`, c.verifiedOnly && 'verified'];
  return bits.filter(Boolean).join(' · ') || 'All listings';
}

export function criteriaToQueryString(c: SavedSearchCriteria): string {
  const p = new URLSearchParams();
  if (c.q) p.set('q', c.q);
  if (c.category) p.set('category', c.category);
  if (c.subCategory) p.set('subCategory', c.subCategory);
  if (c.brand) p.set('brand', c.brand);
  if (c.sizes?.length) p.set('sizes', c.sizes.join(','));
  if (c.conditions?.length) p.set('conditions', c.conditions.join(','));
  if (c.priceRange) p.set('priceRange', c.priceRange.join(','));
  if (c.verifiedOnly) p.set('verifiedOnly', 'true');
  return p.toString();
}
