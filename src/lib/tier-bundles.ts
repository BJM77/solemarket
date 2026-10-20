/**
 * Bronze / Silver / Gold bundle tiers ("any N for $X").
 *
 * Rules (shared by the cart and createOrderAction):
 *  - A listing joins one tier via `multiCardTier` ('bronze' | 'silver' | 'gold').
 *    Legacy 'platinum' is ignored here.
 *  - Only Cards and Coins take part, and a tier only counts items from its own group
 *    (card tiers count cards, coin tiers count coins).
 *  - A bundle only counts items from the SAME seller, because buyers pay each seller's
 *    PayID directly.
 *  - Within seller + group + tier, units are sorted most expensive first and grouped
 *    into sets of N. Each set is charged the tier price only if that is cheaper than
 *    buying the items individually. This gives the buyer the lowest total: bundling
 *    the priciest items maximises the saving, and later sets can only save less.
 *  - Leftover units keep their normal price.
 *  - Prices come from admin settings (Firestore settings/multibuy_tiers), never the client.
 */
import { isCardCategory, isCoinCategory } from '@/lib/constants/marketplace';

export const BUNDLE_TIERS = ['bronze', 'silver', 'gold'] as const;
export type BundleTier = typeof BUNDLE_TIERS[number];
export type TierGroup = 'cards' | 'coins';
export const TIER_GROUPS: TierGroup[] = ['cards', 'coins'];

export interface TierRule { quantity: number; price: number }
export type TierGroupSettings = Record<BundleTier, TierRule>;
export interface TierSettings { enabled: boolean; cards: TierGroupSettings; coins: TierGroupSettings }

export const MIN_TIER_QTY = 2;
export const MAX_TIER_QTY = 20;

const defaultGroup = (): TierGroupSettings => ({
    bronze: { quantity: 5, price: 20 },
    silver: { quantity: 5, price: 40 },
    gold: { quantity: 5, price: 60 },
});
export const DEFAULT_TIER_SETTINGS: TierSettings = { enabled: true, cards: defaultGroup(), coins: defaultGroup() };

export const TIER_LABEL: Record<BundleTier, string> = { bronze: 'Bronze', silver: 'Silver', gold: 'Gold' };

export function isBundleTier(v: unknown): v is BundleTier {
    return typeof v === 'string' && (BUNDLE_TIERS as readonly string[]).includes(v);
}

export function tierGroupFor(category?: string | null): TierGroup | null {
    if (!category) return null;
    if (isCardCategory(category)) return 'cards';
    if (isCoinCategory(category)) return 'coins';
    return null;
}

/** Throws with a readable message on bad admin input. */
export function validateTierSettings(raw: any): TierSettings {
    const out: TierSettings = { enabled: raw?.enabled !== false, cards: defaultGroup(), coins: defaultGroup() };
    for (const g of TIER_GROUPS) {
        for (const t of BUNDLE_TIERS) {
            const r = raw?.[g]?.[t];
            const quantity = Math.floor(Number(r?.quantity));
            const price = Math.round(Number(r?.price) * 100) / 100;
            const name = `${g === 'cards' ? 'Cards' : 'Coins'} ${TIER_LABEL[t]}`;
            if (!Number.isFinite(quantity) || quantity < MIN_TIER_QTY || quantity > MAX_TIER_QTY) {
                throw new Error(`${name}: quantity must be between ${MIN_TIER_QTY} and ${MAX_TIER_QTY}.`);
            }
            if (!Number.isFinite(price) || price < 1 || price > 100000) {
                throw new Error(`${name}: price must be between $1 and $100,000.`);
            }
            out[g][t] = { quantity, price };
        }
    }
    return out;
}

/** Lenient version for reading stored settings: bad/missing values fall back to defaults. */
export function normalizeTierSettings(raw: any): TierSettings {
    const out: TierSettings = { enabled: raw?.enabled !== false, cards: defaultGroup(), coins: defaultGroup() };
    for (const g of TIER_GROUPS) {
        for (const t of BUNDLE_TIERS) {
            const r = raw?.[g]?.[t];
            const quantity = Math.floor(Number(r?.quantity));
            const price = Math.round(Number(r?.price) * 100) / 100;
            if (Number.isFinite(quantity) && quantity >= MIN_TIER_QTY && quantity <= MAX_TIER_QTY
                && Number.isFinite(price) && price >= 1 && price <= 100000) {
                out[g][t] = { quantity, price };
            }
        }
    }
    return out;
}

export function formatMoney(n: number): string {
    return Number.isInteger(n) ? `$${n}` : `$${n.toFixed(2)}`;
}

export function tierOfferText(rule: TierRule): string {
    return `${rule.quantity} for ${formatMoney(rule.price)}`;
}

export function groupNoun(g: TierGroup, n: number): string {
    return g === 'cards' ? (n === 1 ? 'card' : 'cards') : (n === 1 ? 'coin' : 'coins');
}

export interface TierUnit { line: number; cents: number }

export interface TierPoolInput {
    sellerId: string;
    group: TierGroup;
    tier: BundleTier;
    units: TierUnit[];
}

export interface TierPoolResult {
    /** Units that were bundled, with their share of the bundle price in cents. */
    assigned: { line: number; cents: number }[];
    sets: number;
    originalCents: number;
    priceCents: number;
}

/** Splits `totalCents` proportionally; remainder goes to the last unit. */
function split(totalCents: number, weights: number[]): number[] {
    const sum = weights.reduce((a, b) => a + b, 0);
    const out = weights.map(w => sum > 0 ? Math.floor((totalCents * w) / sum) : Math.floor(totalCents / weights.length));
    out[out.length - 1] += totalCents - out.reduce((a, b) => a + b, 0);
    return out;
}

/** Cheapest way to fill sets of `rule.quantity` from the pool. */
export function priceTierPool(units: TierUnit[], rule: TierRule): TierPoolResult {
    const sorted = [...units].sort((a, b) => b.cents - a.cents || a.line - b.line);
    const n = rule.quantity;
    const priceCents = Math.round(rule.price * 100);
    const assigned: { line: number; cents: number }[] = [];
    let sets = 0, originalCents = 0;
    for (let g = 0; (g + 1) * n <= sorted.length; g++) {
        const grp = sorted.slice(g * n, (g + 1) * n);
        const sum = grp.reduce((a, u) => a + u.cents, 0);
        if (priceCents >= sum) break; // later sets are cheaper still, so no saving
        split(priceCents, grp.map(u => u.cents)).forEach((c, k) => assigned.push({ line: grp[k].line, cents: c }));
        sets++;
        originalCents += sum;
    }
    return { assigned, sets, originalCents, priceCents: priceCents * sets };
}

export interface TierNudge {
    key: string;
    sellerId: string;
    group: TierGroup;
    tier: BundleTier;
    inCart: number;
    completeSets: number;
    /** Items needed to finish the next set (0 when every unit is in a complete set). */
    remaining: number;
    rule: TierRule;
    message: string;
}

export function tierNudge(sellerId: string, group: TierGroup, tier: BundleTier, inCart: number, rule: TierRule, appliedSets: number): TierNudge {
    const n = rule.quantity;
    const rem = inCart % n === 0 && inCart > 0 ? 0 : n - (inCart % n);
    const label = TIER_LABEL[tier];
    const offer = `${n} for only ${formatMoney(rule.price)}`;
    const message = rem === 0
        ? `${label} ${groupNoun(group, 2)}: ${offer} applied${appliedSets > 1 ? ` x${appliedSets}` : ''}`
        : `Add ${rem} more ${label} ${groupNoun(group, rem)} to get ${offer}`;
    return { key: `${sellerId}::${group}::${tier}`, sellerId, group, tier, inCart, completeSets: Math.floor(inCart / n), remaining: rem, rule, message };
}
