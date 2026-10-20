/**
 * Shared cart pricing engine: fixed-price bundles + percentage multibuy tiers.
 *
 * Used by the cart (CartContext / CartDrawer) for display AND by createOrderAction for
 * the authoritative total, so the buyer always sees what the server will charge.
 *
 * Bundle policy (keep it simple and customer friendly):
 *  1. A bundle only applies to items from the bundle's seller that are eligible
 *     (picked listing, or matching the bundle's category/tag rule).
 *  2. Eligible units are sorted by unit price, most expensive first, and grouped into
 *     sets of N. Bundling the priciest items gives the buyer the biggest saving.
 *     10 eligible items with N=5 => 2 bundles; leftovers are charged normally.
 *  3. A group is only bundled if the fixed price is cheaper than buying the items
 *     individually (the buyer is never charged more because of a bundle).
 *  4. Each unit can be used by at most one bundle. Bundles are applied in a stable
 *     order (best per-item price first, then id).
 *  5. Units not used by a bundle fall through to the listing's percentage multibuy
 *     tiers (pooled by seller + category, discount capped at 90%).
 *  6. Items that belong to an admin Multi-Listing Deal carry a server-validated
 *     `fixedTotal` and are excluded from bundles and multibuy.
 */
import type { MultibuyTier } from '@/types/multibuy';
import type { FixedPriceBundle } from '@/types/bundles';
import { calculateItemTotal } from '@/lib/pricing';
import { isBundleTier, priceTierPool, tierGroupFor, tierNudge, type BundleTier, type TierGroup, type TierNudge, type TierSettings, type TierUnit } from '@/lib/tier-bundles';

export interface PricingLine {
    id: string;
    sellerId: string;
    category?: string;
    tags?: string[];
    /** Unit price after Dutch-auction adjustment. */
    unitPrice: number;
    quantity: number;
    multibuyEnabled?: boolean;
    multibuyTiers?: MultibuyTier[];
    /** Pre-computed total for deal-priced lines (excluded from bundles/multibuy). */
    fixedTotal?: number;
    /** Bronze/Silver/Gold bundle tier (multiCardTier). */
    bundleTier?: string;
}

export interface AppliedTierBundle {
    key: string;
    sellerId: string;
    group: TierGroup;
    tier: BundleTier;
    sets: number;
    quantity: number;
    price: number;
    originalValue: number;
}

export interface PricedLine {
    index: number;
    id: string;
    quantity: number;
    originalTotal: number;
    total: number;
    bundledUnits: number;
    bundleIds: string[];
    multibuyPercent: number;
    /** Units priced by a Bronze/Silver/Gold tier bundle. */
    tierUnits: number;
}

export interface AppliedBundle {
    bundleId: string;
    name: string;
    sellerId: string;
    count: number;
    price: number;
    originalValue: number;
}

export interface CartPricing {
    lines: PricedLine[];
    bundles: AppliedBundle[];
    tierBundles: AppliedTierBundle[];
    tierNudges: TierNudge[];
    subtotal: number;
    originalSubtotal: number;
    savings: number;
}

export const MAX_DISCOUNT_PERCENT = 90;

const toCents = (n: number) => Math.round(n * 100);
const fromCents = (c: number) => c / 100;

function toDate(v: any): Date | null {
    if (!v) return null;
    if (v instanceof Date) return v;
    if (typeof v.toDate === 'function') return v.toDate();
    if (typeof v === 'object' && typeof v._seconds === 'number') return new Date(v._seconds * 1000);
    if (typeof v === 'object' && typeof v.seconds === 'number') return new Date(v.seconds * 1000);
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
}

/** Active and inside its validity window. */
export function isBundleLive(b: FixedPriceBundle, now: Date = new Date()): boolean {
    if (!b || !b.isActive) return false;
    if (!(b.quantity >= 2) || !(b.price > 0)) return false;
    const start = toDate(b.startsAt);
    const end = toDate(b.endsAt);
    if (start && now < start) return false;
    if (end && now > end) return false;
    return true;
}

export function isLineEligible(b: FixedPriceBundle, line: Pick<PricingLine, 'id' | 'sellerId' | 'category' | 'tags'>): boolean {
    if (line.sellerId !== b.sellerId) return false;
    if (b.listingIds?.includes(line.id)) return true;
    if (b.category && line.category === b.category) return true;
    if (b.tag && (line.tags || []).some(t => t.toLowerCase() === b.tag!.toLowerCase())) return true;
    return false;
}

/** Split `totalCents` across weights proportionally; remainder goes to the last unit. */
export function splitProRata(totalCents: number, weights: number[]): number[] {
    const sum = weights.reduce((a, b) => a + b, 0);
    const out = weights.map(w => sum > 0 ? Math.floor((totalCents * w) / sum) : Math.floor(totalCents / weights.length));
    const diff = totalCents - out.reduce((a, b) => a + b, 0);
    out[out.length - 1] += diff;
    return out;
}

function bundleOrder(a: FixedPriceBundle, b: FixedPriceBundle) {
    const pa = a.price / a.quantity, pb = b.price / b.quantity;
    if (pa !== pb) return pa - pb;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/**
 * Price a cart. `allowance[bundleId]` optionally caps how many times each bundle may
 * be applied (used server-side for maxPerCustomer).
 */
export function priceCart(
    lines: PricingLine[],
    bundles: FixedPriceBundle[] = [],
    opts: { now?: Date; allowance?: Record<string, number>; tierSettings?: TierSettings | null } = {},
): CartPricing {
    const now = opts.now ?? new Date();
    const lineCents = lines.map(() => 0);
    const claimed = lines.map(() => 0);
    const bundleIds: string[][] = lines.map(() => []);
    const applied: AppliedBundle[] = [];

    // Deal-priced lines are fully claimed.
    lines.forEach((l, i) => {
        if (l.fixedTotal !== undefined) {
            claimed[i] = l.quantity;
            lineCents[i] = toCents(l.fixedTotal);
        }
    });

    const live = bundles.filter(b => isBundleLive(b, now)).sort(bundleOrder);
    for (const b of live) {
        const units: { i: number; cents: number }[] = [];
        lines.forEach((l, i) => {
            if (l.fixedTotal !== undefined || !isLineEligible(b, l)) return;
            const free = l.quantity - claimed[i];
            for (let u = 0; u < free; u++) units.push({ i, cents: toCents(l.unitPrice) });
        });
        units.sort((a, b2) => b2.cents - a.cents || a.i - b2.i);
        let groups = Math.floor(units.length / b.quantity);
        if (opts.allowance && opts.allowance[b.id] !== undefined) {
            groups = Math.min(groups, Math.max(0, opts.allowance[b.id]));
        }
        const priceCents = toCents(b.price);
        let used = 0, orig = 0;
        for (let g = 0; g < groups; g++) {
            const grp = units.slice(g * b.quantity, (g + 1) * b.quantity);
            const sum = grp.reduce((a, u) => a + u.cents, 0);
            if (priceCents >= sum) break; // later groups are cheaper still
            const shares = splitProRata(priceCents, grp.map(u => u.cents));
            grp.forEach((u, k) => {
                lineCents[u.i] += shares[k];
                claimed[u.i] += 1;
                if (!bundleIds[u.i].includes(b.id)) bundleIds[u.i].push(b.id);
            });
            used++;
            orig += sum;
        }
        if (used > 0) {
            applied.push({ bundleId: b.id, name: b.name, sellerId: b.sellerId, count: used, price: fromCents(priceCents * used), originalValue: fromCents(orig) });
        }
    }

    // Bronze / Silver / Gold tier bundles (see src/lib/tier-bundles.ts), same seller only.
    const tierUnits = lines.map(() => 0);
    const tierBundles: AppliedTierBundle[] = [];
    const tierNudges: TierNudge[] = [];
    const ts = opts.tierSettings;
    if (ts && ts.enabled) {
        const pools = new Map<string, { sellerId: string; group: TierGroup; tier: BundleTier; units: TierUnit[] }>();
        lines.forEach((l, i) => {
            if (l.fixedTotal !== undefined || !isBundleTier(l.bundleTier)) return;
            const group = tierGroupFor(l.category);
            if (!group) return;
            const key = `${l.sellerId}::${group}::${l.bundleTier}`;
            const pool = pools.get(key) || { sellerId: l.sellerId, group, tier: l.bundleTier, units: [] };
            for (let u = 0; u < l.quantity - claimed[i]; u++) pool.units.push({ line: i, cents: toCents(l.unitPrice) });
            pools.set(key, pool);
        });
        for (const [key, pool] of pools) {
            const rule = ts[pool.group][pool.tier];
            const r = priceTierPool(pool.units, rule);
            r.assigned.forEach(a => { lineCents[a.line] += a.cents; claimed[a.line] += 1; tierUnits[a.line] += 1; });
            if (r.sets > 0) {
                tierBundles.push({ key, sellerId: pool.sellerId, group: pool.group, tier: pool.tier, sets: r.sets, quantity: rule.quantity, price: fromCents(r.priceCents), originalValue: fromCents(r.originalCents) });
            }
            if (pool.units.length > 0) tierNudges.push(tierNudge(pool.sellerId, pool.group, pool.tier, pool.units.length, rule, r.sets));
        }
    }

    // Multibuy tiers on whatever is left, pooled by seller + category.
    const poolQty = new Map<string, number>();
    lines.forEach((l, i) => {
        if (!l.multibuyEnabled || l.fixedTotal !== undefined) return;
        const key = `${l.sellerId}::${l.category ?? ''}`;
        poolQty.set(key, (poolQty.get(key) || 0) + (l.quantity - claimed[i]));
    });
    const multibuyPercent = lines.map(() => 0);
    lines.forEach((l, i) => {
        const rest = l.quantity - claimed[i];
        if (rest <= 0) return;
        const pooled = l.multibuyEnabled ? (poolQty.get(`${l.sellerId}::${l.category ?? ''}`) || rest) : rest;
        const t = calculateItemTotal(l.unitPrice, rest, l.multibuyEnabled, l.multibuyTiers, pooled);
        lineCents[i] += toCents(t);
        const full = l.unitPrice * rest;
        if (full > 0 && t < full) multibuyPercent[i] = Math.round((1 - t / full) * 100);
    });

    const priced: PricedLine[] = lines.map((l, i) => ({
        index: i,
        id: l.id,
        quantity: l.quantity,
        originalTotal: fromCents(toCents(l.unitPrice) * l.quantity),
        total: fromCents(lineCents[i]),
        bundledUnits: l.fixedTotal !== undefined ? 0 : claimed[i],
        bundleIds: bundleIds[i],
        multibuyPercent: multibuyPercent[i],
        tierUnits: tierUnits[i],
    }));
    const subtotal = fromCents(lineCents.reduce((a, b) => a + b, 0));
    const originalSubtotal = fromCents(priced.reduce((a, p) => a + toCents(p.originalTotal), 0));
    return { lines: priced, bundles: applied, tierBundles, tierNudges, subtotal, originalSubtotal, savings: fromCents(toCents(originalSubtotal) - toCents(subtotal)) };
}

export interface BundleProgress {
    bundle: FixedPriceBundle;
    eligibleInCart: number;
    completeBundles: number;
    /** Items still needed to complete the next bundle. */
    remaining: number;
    label: string;
}

export function formatBundleOffer(b: Pick<FixedPriceBundle, 'quantity' | 'price'>): string {
    const p = Number.isInteger(b.price) ? `$${b.price}` : `$${b.price.toFixed(2)}`;
    return `${b.quantity} for ${p}`;
}

/** Progress towards a bundle given the current cart lines. */
export function bundleProgress(b: FixedPriceBundle, lines: Pick<PricingLine, 'id' | 'sellerId' | 'category' | 'tags' | 'quantity' | 'fixedTotal'>[]): BundleProgress {
    const eligibleInCart = lines
        .filter(l => l.fixedTotal === undefined && isLineEligible(b, l))
        .reduce((a, l) => a + l.quantity, 0);
    const completeBundles = Math.floor(eligibleInCart / b.quantity);
    const remaining = b.quantity - (eligibleInCart % b.quantity);
    const offer = formatBundleOffer(b);
    const label = eligibleInCart > 0 && remaining === b.quantity
        ? `${offer} applied${completeBundles > 1 ? ` x${completeBundles}` : ''}`
        : `Add ${remaining} more for ${offer}`;
    return { bundle: b, eligibleInCart, completeBundles, remaining, label };
}

/** Words a bundle `tag` rule can match: explicit tags, search keywords, sub-category, brand. */
export function productTags(p: any): string[] {
    const out = [
        ...(Array.isArray(p?.tags) ? p.tags : []),
        ...(Array.isArray(p?.keywords) ? p.keywords : []),
        p?.subCategory, p?.brand,
    ].filter((x): x is string => typeof x === 'string' && x.length > 0);
    return Array.from(new Set(out));
}

export interface BundleInput {
    name: string;
    description?: string;
    listingIds: string[];
    category?: string | null;
    tag?: string | null;
    quantity: number;
    price: number;
    isActive: boolean;
    startsAt?: string | null;
    endsAt?: string | null;
    maxPerCustomer?: number | null;
}

/** Validates + normalises seller input for a bundle. Throws with a readable message. */
export function validateBundleInput(raw: any): BundleInput {
    const name = String(raw?.name ?? '').trim();
    if (name.length < 3 || name.length > 80) throw new Error('Bundle name must be 3-80 characters.');
    const quantity = Math.floor(Number(raw?.quantity));
    if (!Number.isFinite(quantity) || quantity < 2 || quantity > 50) throw new Error('A bundle needs between 2 and 50 items.');
    const price = Math.round(Number(raw?.price) * 100) / 100;
    if (!Number.isFinite(price) || price < 1 || price > 100000) throw new Error('Bundle price must be between $1 and $100,000.');
    const listingIds: string[] = Array.isArray(raw?.listingIds)
        ? Array.from(new Set(raw.listingIds.map((x: any) => String(x)).filter(Boolean))).slice(0, 500) as string[]
        : [];
    const category = raw?.category ? String(raw.category).trim() || null : null;
    const tag = raw?.tag ? String(raw.tag).trim().toLowerCase() || null : null;
    if (!listingIds.length && !category && !tag) throw new Error('Pick some listings, or choose a category or tag rule.');
    const dateOrNull = (v: any, label: string) => {
        if (!v) return null;
        const d = new Date(v);
        if (isNaN(d.getTime())) throw new Error(`Invalid ${label} date.`);
        return d.toISOString();
    };
    const startsAt = dateOrNull(raw?.startsAt, 'start');
    const endsAt = dateOrNull(raw?.endsAt, 'end');
    if (startsAt && endsAt && new Date(endsAt) <= new Date(startsAt)) throw new Error('End date must be after the start date.');
    let maxPerCustomer: number | null = null;
    if (raw?.maxPerCustomer !== undefined && raw?.maxPerCustomer !== null && raw?.maxPerCustomer !== '') {
        maxPerCustomer = Math.floor(Number(raw.maxPerCustomer));
        if (!Number.isFinite(maxPerCustomer) || maxPerCustomer < 1) throw new Error('Max per customer must be at least 1 (or blank for unlimited).');
    }
    const description = raw?.description ? String(raw.description).trim().slice(0, 500) : '';
    return { name, description, listingIds, category, tag, quantity, price, isActive: !!raw?.isActive, startsAt, endsAt, maxPerCustomer };
}
