'use client';
import { Checkbox } from '@/components/ui/checkbox';
import { BUNDLE_TIERS, TIER_LABEL, tierGroupFor, tierOfferText, groupNoun, type BundleTier } from '@/lib/tier-bundles';
import { useTierSettings } from '@/hooks/use-tier-settings';

export const TIER_STYLE: Record<BundleTier, string> = {
    bronze: 'bg-gradient-to-br from-amber-700 via-amber-800 to-amber-950 text-amber-50 border-amber-600/40',
    silver: 'bg-gradient-to-br from-slate-400 via-slate-500 to-slate-700 text-white border-slate-300/40',
    gold: 'bg-gradient-to-br from-yellow-400 via-amber-500 to-yellow-600 text-amber-950 border-yellow-300/50',
};

/**
 * Bronze / Silver / Gold tick boxes. Behaves like a radio group that can be cleared:
 * ticking one unticks the others; unticking the current one clears the tier.
 */
export function BundleTierPicker({ category, value, onChange }: { category?: string; value?: string | null; onChange: (v: BundleTier | null) => void }) {
    const settings = useTierSettings();
    const group = tierGroupFor(category);
    if (!group) return null;
    return (
        <div className="rounded-lg border p-3 space-y-2" data-testid="bundle-tier-picker">
            <div>
                <p className="text-sm font-semibold">Bundle tier</p>
                <p className="text-[11px] text-muted-foreground">
                    Optional. Buyers get a fixed bundle price when they buy enough of your {groupNoun(group, 2)} from the same tier. Any {groupNoun(group, 1)} can go in any tier.
                </p>
            </div>
            <div className="grid grid-cols-3 gap-2">
                {BUNDLE_TIERS.map(t => {
                    const checked = value === t;
                    return (
                        <label key={t} className={`flex flex-col items-center gap-1 rounded-lg border p-2 cursor-pointer select-none transition ${TIER_STYLE[t]} ${checked ? 'ring-2 ring-primary ring-offset-1' : 'opacity-70 hover:opacity-100'}`}>
                            <span className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider">
                                <Checkbox
                                    checked={checked}
                                    onCheckedChange={(c) => onChange(c ? t : null)}
                                    aria-label={`${TIER_LABEL[t]} tier`}
                                    className="bg-white/80"
                                />
                                {TIER_LABEL[t]}
                            </span>
                            <span className="text-[10px] font-semibold">{tierOfferText(settings[group][t])}</span>
                        </label>
                    );
                })}
            </div>
        </div>
    );
}
