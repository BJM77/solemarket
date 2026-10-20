'use client';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { getCurrentUserIdToken } from '@/lib/firebase/auth';
import { getTierSettings, saveTierSettings } from '@/app/actions/marketplace/tier-actions';
import { setTierSettingsCache } from '@/hooks/use-tier-settings';
import { BUNDLE_TIERS, DEFAULT_TIER_SETTINGS, MAX_TIER_QTY, MIN_TIER_QTY, TIER_GROUPS, TIER_LABEL, type TierSettings } from '@/lib/tier-bundles';
import { TIER_STYLE } from '@/components/sell/BundleTierPicker';

export function TierSettingsCard() {
    const { toast } = useToast();
    const [s, setS] = useState<TierSettings>(DEFAULT_TIER_SETTINGS);
    const [saving, setSaving] = useState(false);
    useEffect(() => { getTierSettings().then(setS); }, []);

    const set = (g: 'cards' | 'coins', t: typeof BUNDLE_TIERS[number], k: 'quantity' | 'price', v: string) =>
        setS(prev => ({ ...prev, [g]: { ...prev[g], [t]: { ...prev[g][t], [k]: v === '' ? ('' as any) : Number(v) } } }));

    const save = async () => {
        setSaving(true);
        const res = await saveTierSettings(s, (await getCurrentUserIdToken()) ?? undefined);
        setSaving(false);
        if (res.success && res.settings) {
            setS(res.settings); setTierSettingsCache(res.settings);
            toast({ title: 'Bundle tiers saved' });
        } else toast({ title: 'Could not save', description: res.error, variant: 'destructive' });
    };

    return (
        <Card data-testid="tier-settings">
            <CardHeader>
                <CardTitle>Bronze / Silver / Gold bundles</CardTitle>
                <CardDescription>
                    Buyers get a fixed price for every full set of N items in the same tier from the same seller. Card tiers only count cards and coin tiers only count coins. Quantity {MIN_TIER_QTY}-{MAX_TIER_QTY}.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
                <label className="flex items-center gap-3 text-sm font-medium">
                    <Switch checked={s.enabled} onCheckedChange={(v) => setS(p => ({ ...p, enabled: v }))} aria-label="Bundle tiers on" />
                    Bundle tiers {s.enabled ? 'on' : 'off'}
                </label>
                {TIER_GROUPS.map(g => (
                    <div key={g} className="space-y-2">
                        <h3 className="font-bold text-sm">{g === 'cards' ? 'Cards' : 'Coins'}</h3>
                        <div className="grid gap-3 sm:grid-cols-3">
                            {BUNDLE_TIERS.map(t => (
                                <div key={t} className="rounded-lg border p-3 space-y-2">
                                    <span className={`inline-block rounded px-2 py-0.5 text-[10px] font-black uppercase border ${TIER_STYLE[t]}`}>{TIER_LABEL[t]}</span>
                                    <div className="flex gap-2">
                                        <div className="flex-1">
                                            <Label htmlFor={`${g}-${t}-q`} className="text-xs">Items</Label>
                                            <Input id={`${g}-${t}-q`} type="number" inputMode="numeric" min={MIN_TIER_QTY} max={MAX_TIER_QTY} step={1}
                                                value={s[g][t].quantity} onChange={e => set(g, t, 'quantity', e.target.value)} />
                                        </div>
                                        <div className="flex-1">
                                            <Label htmlFor={`${g}-${t}-p`} className="text-xs">Bundle price ($)</Label>
                                            <Input id={`${g}-${t}-p`} type="number" inputMode="decimal" min={1} step={0.5}
                                                value={s[g][t].price} onChange={e => set(g, t, 'price', e.target.value)} />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
                <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save bundle tiers'}</Button>
            </CardContent>
        </Card>
    );
}
