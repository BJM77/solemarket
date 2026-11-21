/**
 * Helpers for filling a Bronze / Silver / Gold deal from the cart:
 * a seller-filtered /multibuy link, and a shortlist of matching listings.
 *
 * A deal only counts items from the same seller, group (cards vs coins) and tier.
 */
import { availableQuantity, type HoldableProduct } from '@/lib/checkout/holds';
import {
    TIER_LABEL,
    groupNoun,
    isBundleTier,
    tierGroupFor,
    type BundleTier,
    type TierGroup,
} from '@/lib/tier-bundles';

export const SUGGESTION_SPARES = 3;
export const SUGGESTION_MAX = 8;
/** How many listings to load from the seller so the shortlist still has spares after filtering. */
export const SUGGESTION_FETCH_LIMIT = 200;

/** How many matching listings to show: leftover slots plus a few spares, capped. */
export function suggestionCount(remaining: number): number {
    if (!Number.isFinite(remaining) || remaining <= 0) return 0;
    return Math.min(SUGGESTION_MAX, Math.floor(remaining) + SUGGESTION_SPARES);
}

export function dealFillHref(opts: {
    tier: BundleTier;
    sellerId: string;
    group: TierGroup;
    sellerName?: string;
}): string {
    const params = new URLSearchParams();
    params.set('tier', opts.tier);
    params.set('seller', opts.sellerId);
    params.set('group', opts.group);
    const name = opts.sellerName?.trim();
    if (name) params.set('sellerName', name);
    return `/multibuy?${params.toString()}`;
}

export function dealFillLinkLabel(tier: BundleTier, group: TierGroup, sellerName?: string): string {
    const who = sellerName?.trim() || 'this seller';
    return `See more ${TIER_LABEL[tier]} ${groupNoun(group, 2)} from ${who}`;
}

export interface SuggestionCandidate extends HoldableProduct {
    id: string;
    sellerId?: string;
    category?: string;
    multiCardTier?: string | null;
    multibuyEnabled?: boolean;
    isDraft?: boolean;
    isPrivate?: boolean;
    price?: number;
    createdAt?: unknown;
}

export interface SelectDealSuggestionsOpts {
    sellerId: string;
    tier: BundleTier;
    group: TierGroup;
    remaining: number;
    excludeIds?: Iterable<string>;
    buyerId?: string | null;
    now?: number;
}

export function isDealSuggestionEligible(
    listing: SuggestionCandidate | null | undefined,
    opts: Omit<SelectDealSuggestionsOpts, 'remaining'>,
): boolean {
    if (!listing?.id) return false;
    if (listing.status && listing.status !== 'available') return false;
    if (listing.isDraft) return false;
    if (listing.isPrivate) return false;
    if (!(Number(listing.price) > 0)) return false;
    if (listing.sellerId !== opts.sellerId) return false;
    if (opts.buyerId && listing.sellerId === opts.buyerId) return false;
    if (!isBundleTier(listing.multiCardTier) || listing.multiCardTier !== opts.tier) return false;
    if (tierGroupFor(listing.category) !== opts.group) return false;
    if (listing.multibuyEnabled === false) return false;
    if (opts.excludeIds && new Set(opts.excludeIds).has(listing.id)) return false;
    const ignoreHold = opts.buyerId ? `cart:${opts.buyerId}` : undefined;
    if (availableQuantity(listing, opts.now ?? Date.now(), ignoreHold) < 1) return false;
    return true;
}

function createdAtMs(v: unknown): number {
    if (v == null) return 0;
    if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
    if (v instanceof Date) return v.getTime();
    if (typeof (v as any).toMillis === 'function') return (v as any).toMillis();
    if (typeof (v as any).toDate === 'function') return (v as any).toDate().getTime();
    if (typeof v === 'string') {
        const t = Date.parse(v);
        return Number.isNaN(t) ? 0 : t;
    }
    if (typeof (v as any).seconds === 'number') {
        return (v as any).seconds * 1000 + Math.floor(((v as any).nanoseconds || 0) / 1e6);
    }
    if (typeof (v as any)._seconds === 'number') {
        return (v as any)._seconds * 1000 + Math.floor(((v as any)._nanoseconds || 0) / 1e6);
    }
    return 0;
}

/** Keep listings that can fill this deal, newest first, up to the shortlist size. */
export function selectDealSuggestions<T extends SuggestionCandidate>(
    listings: T[],
    opts: SelectDealSuggestionsOpts,
): T[] {
    const limit = suggestionCount(opts.remaining);
    if (limit <= 0) return [];
    return [...listings]
        .filter((p) => isDealSuggestionEligible(p, opts))
        .sort((a, b) => createdAtMs(b.createdAt) - createdAtMs(a.createdAt) || a.id.localeCompare(b.id))
        .slice(0, limit);
}
