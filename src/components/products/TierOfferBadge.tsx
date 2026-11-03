'use client';
import Link from 'next/link';
import { Layers } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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

    const fullText = neededMore === 0
        ? `${TIER_LABEL[tier]} Multibuy: eligible for the $${rule.price} ${TIER_LABEL[tier]} bundle with this item (${totalWithCurrent} ${groupNoun(group, totalWithCurrent)})`
        : `${TIER_LABEL[tier]} Multibuy: Add ${neededMore} more in ${TIER_LABEL[tier]} for $${rule.price} (${tierOfferText(rule).replace(' for ', ` ${groupNoun(group, rule.quantity)} for `)})`;

    return (
        <TooltipProvider delayDuration={150}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Link href={`/multibuy?tier=${tier}`} data-testid="tier-offer-badge" aria-label={fullText} title={fullText}
                        className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-black uppercase tracking-wider transition-all hover:opacity-90 ${TIER_STYLE[tier]}`}>
                        <Layers className="w-3.5 h-3.5 shrink-0" aria-hidden />
                        {TIER_LABEL[tier]}
                    </Link>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs text-xs">{fullText}</TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
