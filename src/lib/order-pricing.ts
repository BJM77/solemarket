/**
 * Authoritative order pricing (pure, unit-tested). createOrderAction loads products, deals,
 * bundles and usage counters inside its transaction and passes them here.
 *
 * SECURITY: nothing price-related from the client is trusted. The client may only say
 * which product, how many, and (optionally) which deal instance an item belongs to.
 * Any client `bundlePrice` is ignored; deal and bundle prices come from Firestore.
 */
import type { Product } from '@/lib/types';
import type { Deal, MultiCardTier } from '@/types/deals';
import type { FixedPriceBundle } from '@/types/bundles';
import type { TierSettings } from '@/lib/tier-bundles';
import { calculateDutchAuctionPrice } from '@/lib/pricing';
import { priceCart, productTags, splitProRata, type CartPricing, type PricingLine } from '@/lib/bundles';

export interface OrderRequestItem {
    id: string;
    quantity: number;
    dealId?: string;
    /** Ignored. Kept only so old clients don't break. */
    bundlePrice?: number;
}

export class OrderPricingError extends Error {}

/** Cart deal instances look like `${dealId}-${timestamp}`. Returns the Firestore deal id. */
export function parseDealId(instanceId: string): string {
    return String(instanceId).replace(/-\d{10,}$/, '');
}

function toDate(v: any): Date | null {
    if (!v) return null;
    if (v instanceof Date) return v;
    if (typeof v.toDate === 'function') return v.toDate();
    if (typeof v._seconds === 'number') return new Date(v._seconds * 1000);
    if (typeof v.seconds === 'number') return new Date(v.seconds * 1000);
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
}

export function unitPriceFor(product: Product, now: Date = new Date()): number {
    if (product.isDutchAuction && product.dutchAuctionStartTime && product.dutchAuctionDropAmount && product.dutchAuctionIntervalHours && product.dutchAuctionFloorPrice !== undefined) {
        return calculateDutchAuctionPrice(product.price, product.dutchAuctionDropAmount, product.dutchAuctionIntervalHours, product.dutchAuctionFloorPrice, product.dutchAuctionStartTime);
    }
    return product.price;
}

/** Validate one deal instance against the products in it and return per-item totals. */
export function priceDealGroup(deal: Deal | null | undefined, products: Product[], quantities: number[], now: Date = new Date()): number[] {
    if (!deal) throw new OrderPricingError('This bundle deal no longer exists.');
    if (!deal.isActive) throw new OrderPricingError(`The deal "${deal.name}" is no longer active.`);
    const until = toDate(deal.validUntil);
    if (until && now > until) throw new OrderPricingError(`The deal "${deal.name}" has expired.`);
    if (quantities.some(q => q !== 1)) throw new OrderPricingError('Deal items must have a quantity of 1.');
    if (new Set(products.map(p => p.id)).size !== products.length) throw new OrderPricingError('A deal cannot contain the same item twice.');
    const counts: Record<string, number> = { bronze: 0, silver: 0, gold: 0, platinum: 0 };
    for (const p of products) {
        const tier = (p as any).multiCardTier as MultiCardTier;
        if (!tier || counts[tier] === undefined) throw new OrderPricingError(`${p.title} is not part of a deal tier.`);
        counts[tier]++;
    }
    const req = deal.requirements || { bronze: 0, silver: 0, gold: 0, platinum: 0 };
    for (const t of ['bronze', 'silver', 'gold', 'platinum'] as const) {
        if (counts[t] !== (req[t] || 0)) {
            throw new OrderPricingError(`The deal "${deal.name}" needs exactly ${req[t] || 0} ${t} card(s); your cart has ${counts[t]}.`);
        }
    }
    const unit = products.map(p => Math.round(unitPriceFor(p, now) * 100));
    const full = unit.reduce((a, b) => a + b, 0);
    const dealCents = Math.min(full, Math.round(Number(deal.price) * 100));
    if (!(dealCents >= 0)) throw new OrderPricingError('Invalid deal price.');
    return splitProRata(dealCents, unit).map(c => c / 100);
}

export interface OrderPricingInput {
    items: OrderRequestItem[];
    products: Product[]; // same order as items
    deals: Record<string, Deal | null>;
    bundles: FixedPriceBundle[];
    /** How many more times the buyer may use each bundle / deal (maxPerCustomer - used). */
    bundleAllowance?: Record<string, number>;
    /** Admin Bronze/Silver/Gold settings (loaded server-side). */
    tierSettings?: TierSettings | null;
    dealAllowance?: Record<string, number>;
    now?: Date;
}

export interface OrderPricingResult {
    pricing: CartPricing;
    lineTotals: number[];
    /** deal id -> number of deal instances used. */
    dealUsage: Record<string, number>;
    /** bundle id -> number of bundles applied. */
    bundleUsage: Record<string, number>;
}

export function buildOrderPricing(input: OrderPricingInput): OrderPricingResult {
    const now = input.now ?? new Date();
    const { items, products } = input;
    if (items.length !== products.length) throw new OrderPricingError('Cart mismatch.');
    items.forEach((it) => {
        if (!Number.isInteger(it.quantity) || it.quantity < 1 || it.quantity > 1000) {
            throw new OrderPricingError('Invalid item quantity.');
        }
    });

    // Group deal items by cart instance.
    const groups = new Map<string, number[]>();
    items.forEach((it, i) => {
        if (it.dealId) {
            const g = groups.get(it.dealId) || [];
            g.push(i);
            groups.set(it.dealId, g);
        }
    });

    const fixedTotals: (number | undefined)[] = items.map(() => undefined);
    const dealUsage: Record<string, number> = {};
    for (const [instance, idxs] of groups) {
        const dealId = parseDealId(instance);
        const totals = priceDealGroup(input.deals[dealId], idxs.map(i => products[i]), idxs.map(i => items[i].quantity), now);
        idxs.forEach((i, k) => { fixedTotals[i] = totals[k]; });
        dealUsage[dealId] = (dealUsage[dealId] || 0) + 1;
    }
    for (const [dealId, used] of Object.entries(dealUsage)) {
        const left = input.dealAllowance?.[dealId];
        if (left !== undefined && used > left) {
            throw new OrderPricingError(`You've reached the limit for the deal "${input.deals[dealId]?.name ?? dealId}".`);
        }
    }

    const lines: PricingLine[] = products.map((p, i) => ({
        id: p.id,
        sellerId: p.sellerId,
        category: p.category,
        tags: productTags(p),
        unitPrice: unitPriceFor(p, now),
        quantity: items[i].quantity,
        multibuyEnabled: p.multibuyEnabled,
        multibuyTiers: p.multibuyTiers,
        fixedTotal: fixedTotals[i],
        bundleTier: (p as any).multiCardTier,
    }));
    const pricing = priceCart(lines, input.bundles, { now, allowance: input.bundleAllowance, tierSettings: input.tierSettings });
    const bundleUsage: Record<string, number> = {};
    pricing.bundles.forEach(b => { bundleUsage[b.bundleId] = b.count; });
    return { pricing, lineTotals: pricing.lines.map(l => l.total), dealUsage, bundleUsage };
}

/** Client-side: turn cart items (Product + quantity, maybe deal info) into pricing lines. */
export function cartItemsToLines(items: Array<Product & { quantity: number; dealId?: string; bundlePrice?: number }>, now: Date = new Date()): PricingLine[] {
    return items.map(it => ({
        id: it.id,
        sellerId: it.sellerId,
        category: it.category,
        tags: productTags(it),
        unitPrice: unitPriceFor(it, now),
        quantity: it.quantity,
        multibuyEnabled: it.multibuyEnabled,
        multibuyTiers: it.multibuyTiers,
        // Display only: the server re-validates and re-prices deals at checkout.
        fixedTotal: it.dealId && it.bundlePrice !== undefined ? it.bundlePrice : undefined,
        bundleTier: (it as any).multiCardTier,
    }));
}
