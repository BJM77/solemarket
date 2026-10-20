'use client';
import Link from 'next/link';
import { Layers } from 'lucide-react';
import { useTierSettings } from '@/hooks/use-tier-settings';
import { TIER_LABEL, groupNoun, isBundleTier, tierGroupFor, tierOfferText } from '@/lib/tier-bundles';
import { TIER_STYLE } from '@/components/sell/BundleTierPicker';

/** "Bronze bundle: any 5 cards for $20 from this seller" on listing pages. */
export function TierOfferBadge({ tier, category }: { tier?: string | null; category?: string }) {
    const settings = useTierSettings();
    const group = tierGroupFor(category);
    if (!group || !isBundleTier(tier) || !settings.enabled) return null;
    const rule = settings[group][tier];
    return (
        <Link href={`/multibuy?tier=${tier}`} data-testid="tier-offer-badge"
            className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold w-full ${TIER_STYLE[tier]}`}>
            <Layers className="w-4 h-4 shrink-0" aria-hidden />
            <span>
                <span className="font-black uppercase tracking-wider">{TIER_LABEL[tier]} bundle:</span>{' '}
                any {tierOfferText(rule).replace(' for ', ` ${groupNoun(group, rule.quantity)} for `)} from this seller
            </span>
        </Link>
    );
}
