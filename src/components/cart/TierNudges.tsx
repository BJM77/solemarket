'use client';
import type { CartPricing } from '@/lib/bundles';
import { TIER_LABEL, formatMoney, groupNoun } from '@/lib/tier-bundles';
import { dealFillHref, dealFillLinkLabel } from '@/lib/tier-suggestions';
import { DealSuggestionRow } from '@/components/cart/DealSuggestionRow';
import { Layers } from 'lucide-react';
import Link from 'next/link';

/** "Add 2 more Bronze cards to get 5 for only $20" notes + a seller-filtered link and matching listings. */
export function TierNudges({ pricing, sellerNames }: { pricing: CartPricing; sellerNames?: Record<string, string> }) {
    const nudges = pricing.tierNudges || [];
    if (!nudges.length) return null;
    const multiSeller = new Set(nudges.map(n => n.sellerId)).size > 1;
    return (
        <div className="space-y-1.5" data-testid="tier-nudges">
            {nudges.map(n => {
                const applied = pricing.tierBundles.find(b => b.key === n.key);
                const saved = applied ? applied.originalValue - applied.price : 0;
                const sellerName = sellerNames?.[n.sellerId] || 'this seller';
                const unfilled = n.remaining > 0;
                return (
                    <div key={n.key} className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-xs ${n.remaining === 0 ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-300'}`}>
                        <Layers className="w-3.5 h-3.5 mt-0.5 shrink-0" aria-hidden />
                        <div className="min-w-0 flex-1">
                            <p className="font-semibold" data-testid="tier-nudge">{n.message}</p>
                            {(saved > 0.004 || multiSeller) && (
                                <p className="text-[11px] opacity-80">
                                    {saved > 0.004 && <>{applied!.sets} {TIER_LABEL[n.tier]} bundle{applied!.sets > 1 ? 's' : ''} saving {formatMoney(Math.round(saved * 100) / 100)}. </>}
                                    {multiSeller && <>Only {groupNoun(n.group, 2)} from {sellerName} count.</>}
                                </p>
                            )}
                            {unfilled && (
                                <>
                                    <Link
                                        href={dealFillHref({ tier: n.tier, sellerId: n.sellerId, group: n.group, sellerName: sellerNames?.[n.sellerId] })}
                                        data-testid="tier-nudge-link"
                                        className="mt-1 inline-block font-semibold underline underline-offset-2 decoration-current/40 hover:decoration-current"
                                    >
                                        {dealFillLinkLabel(n.tier, n.group, sellerNames?.[n.sellerId])}
                                    </Link>
                                    <DealSuggestionRow nudge={n} />
                                </>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
