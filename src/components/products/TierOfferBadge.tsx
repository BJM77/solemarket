'use client';
import Link from 'next/link';
import { Layers, ArrowRight } from 'lucide-react';
import { useTierSettings } from '@/hooks/use-tier-settings';
import { TIER_LABEL, groupNoun, isBundleTier, tierGroupFor, tierOfferText } from '@/lib/tier-bundles';
import { TIER_STYLE } from '@/components/sell/BundleTierPicker';
import { useCart } from '@/context/CartContext';

/** "Bronze bundle: any 5 cards for $20 from this seller" on listing pages, with dynamic cart progress nudge. */
export function TierOfferBadge({ tier, category, sellerId }: { tier?: string | null; category?: string; sellerId?: string }) {
    const settings = useTierSettings();
    const { items } = useCart();
    const group = tierGroupFor(category);
    if (!group || !isBundleTier(tier) || !settings.enabled) return null;
    const rule = settings[group][tier];

    const matchingInCart = items
        .filter((it) => it.multiCardTier === tier && tierGroupFor(it.category) === group && (!sellerId || it.sellerId === sellerId))
        .reduce((sum, it) => sum + (it.quantity || 1), 0);

    // If the shopper adds the item currently being viewed, how many MORE would they need to hit the bundle threshold?
    // e.g. If bundle requires 5 cards:
    // With 0 in cart: adding this card means they need 4 more to hit 5.
    // With 1 in cart: total with this card would be 2, needing 3 more.
    // If they already have a full bundle (e.g. 5 in cart), starting a new bundle with this card needs (5 - 1) = 4 more.
    const totalWithCurrent = matchingInCart + 1;
    const remainder = totalWithCurrent % rule.quantity;
    const neededMore = remainder === 0 ? 0 : rule.quantity - remainder;

    return (
        <Link href={sellerId ? `/multibuy?tier=${tier}&seller=${sellerId}` : `/multibuy?tier=${tier}`} data-testid="tier-offer-badge"
            className={`flex items-center justify-between gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-semibold w-full transition-all hover:opacity-90 ${TIER_STYLE[tier]}`}>
            <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 shrink-0" aria-hidden />
                <span>
                    <span className="font-black uppercase tracking-wider">{TIER_LABEL[tier]} Multibuy:</span>{' '}
                    {neededMore === 0 ? (
                        <>Eligible for <b>${rule.price}</b> {TIER_LABEL[tier]} bundle with this item ({totalWithCurrent} cards)!</>
                    ) : (
                        <>Add <b>{neededMore} more</b> in {TIER_LABEL[tier]} for <b>${rule.price}</b> ({tierOfferText(rule).replace(' for ', ` ${groupNoun(group, rule.quantity)} for `)})</>
                    )}
                </span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 shrink-0 opacity-70" />
        </Link>
    );
}
