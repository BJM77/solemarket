'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { getCurrentUserIdToken } from '@/lib/firebase/auth';
import { bulkAssignTier, listTierCandidates, type TierCandidate } from '@/app/actions/marketplace/tier-actions';
import { BUNDLE_TIERS, TIER_LABEL, type BundleTier } from '@/lib/tier-bundles';
import { TIER_STYLE } from '@/components/sell/BundleTierPicker';

/** Tick listings, then put them all in Bronze/Silver/Gold (or clear) in one click. */
export function TierBulkAssign({ scope }: { scope: 'mine' | 'all' }) {
    const { toast } = useToast();
    const [items, setItems] = useState<TierCandidate[]>([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [q, setQ] = useState('');
    const [selected, setSelected] = useState<Set<string>>(new Set());

    const load = useCallback(async () => {
        setLoading(true);
        const res = await listTierCandidates(scope, (await getCurrentUserIdToken()) ?? undefined);
        setLoading(false);
        if (res.success) setItems(res.items || []);
        else toast({ title: 'Could not load listings', description: res.error, variant: 'destructive' });
    }, [scope, toast]);
    useEffect(() => { load(); }, [load]);

    const shown = useMemo(() => {
        const s = q.trim().toLowerCase();
        return s ? items.filter(i => i.title.toLowerCase().includes(s) || i.category.toLowerCase().includes(s)) : items;
    }, [items, q]);
    const allShown = shown.length > 0 && shown.every(i => selected.has(i.id));

    const apply = async (tier: BundleTier | null) => {
        setBusy(true);
        const res = await bulkAssignTier(Array.from(selected), tier, (await getCurrentUserIdToken()) ?? undefined);
        setBusy(false);
        if (res.success) {
            toast({ title: tier ? `Moved ${res.updated} to ${TIER_LABEL[tier]}` : `Cleared tier on ${res.updated}`, description: res.skipped ? `${res.skipped} skipped` : undefined });
            setItems(prev => prev.map(i => selected.has(i.id) ? { ...i, tier } : i));
            setSelected(new Set());
        } else toast({ title: 'Update failed', description: res.error, variant: 'destructive' });
    };

    return (
        <Card data-testid="tier-bulk-assign">
            <CardHeader>
                <CardTitle>Bulk tier assignment</CardTitle>
                <CardDescription>Tick {scope === 'all' ? 'any live' : 'your'} card or coin listings, then choose a tier.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                    <Input placeholder="Search listings" value={q} onChange={e => setQ(e.target.value)} className="max-w-xs" aria-label="Search listings" />
                    <span className="text-xs text-muted-foreground">{selected.size} selected</span>
                    {BUNDLE_TIERS.map(t => (
                        <Button key={t} size="sm" disabled={busy || !selected.size} onClick={() => apply(t)} className={`border ${TIER_STYLE[t]}`}>{TIER_LABEL[t]}</Button>
                    ))}
                    <Button size="sm" variant="outline" disabled={busy || !selected.size} onClick={() => apply(null)}>Clear tier</Button>
                </div>
                {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : shown.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No card or coin listings found.</p>
                ) : (
                    <div className="max-h-[480px] overflow-auto rounded border divide-y">
                        <label className="flex items-center gap-3 px-3 py-2 text-xs font-semibold bg-muted/50 sticky top-0">
                            <Checkbox checked={allShown} onCheckedChange={(c) => setSelected(prev => {
                                const n = new Set(prev); shown.forEach(i => c ? n.add(i.id) : n.delete(i.id)); return n;
                            })} aria-label="Select all shown" />
                            Select all shown ({shown.length})
                        </label>
                        {shown.map(i => (
                            <label key={i.id} className="flex items-center gap-3 px-3 py-2 text-sm cursor-pointer hover:bg-muted/40">
                                <Checkbox checked={selected.has(i.id)} onCheckedChange={(c) => setSelected(prev => {
                                    const n = new Set(prev); if (c) n.add(i.id); else n.delete(i.id); return n;
                                })} aria-label={`Select ${i.title}`} />
                                {i.imageUrl ? <img src={i.imageUrl} alt="" className="w-8 h-8 rounded object-cover" /> : <span className="w-8 h-8 rounded bg-muted" />}
                                <span className="flex-1 truncate">{i.title}{scope === 'all' && i.sellerName ? <span className="text-muted-foreground"> · {i.sellerName}</span> : null}</span>
                                <span className="text-xs text-muted-foreground">{i.category}</span>
                                <span className="text-xs w-16 text-right">${i.price.toFixed(2)}</span>
                                <span className={`text-[10px] w-14 text-center font-black uppercase rounded border px-1 ${i.tier ? TIER_STYLE[i.tier] : 'text-muted-foreground'}`}>{i.tier ? TIER_LABEL[i.tier] : '—'}</span>
                            </label>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
