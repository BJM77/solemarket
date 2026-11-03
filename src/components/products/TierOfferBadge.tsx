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

    const rem = rule.quantity - (matchingInCart % rule.quantity);
    const neededIfIncludeCurrent = matchingInCart > 0 ? rem : Math.max(1, rule.quantity - 1);

    return (
        <Link href={sellerId ? `/multibuy?tier=${tier}&seller=${sellerId}` : `/multibuy?tier=${tier}`} data-testid="tier-offer-badge"
            className={`flex items-center justify-between gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-semibold w-full transition-all hover:opacity-90 ${TIER_STYLE[tier]}`}>
            <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 shrink-0" aria-hidden />
                <span>
                    <span className="font-black uppercase tracking-wider">{TIER_LABEL[tier]} Multibuy:</span>{' '}
                    {matchingInCart > 0 ? (
                        <>Add <b>{rem} more</b> in {TIER_LABEL[tier]} for <b>${rule.price}</b> ({matchingInCart} in cart)</>
                    ) : (
                        <>Add <b>{neededIfIncludeCurrent} more</b> in {TIER_LABEL[tier]} for <b>${rule.price}</b> (any {tierOfferText(rule).replace(' for ', ` ${groupNoun(group, rule.quantity)} for `)})</>
                    )}
                </span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 shrink-0 opacity-70" />
        </Link>
    );
}
