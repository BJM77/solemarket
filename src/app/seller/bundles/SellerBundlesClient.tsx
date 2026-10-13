'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, Package, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/firebase';
import { getCurrentUserIdToken } from '@/lib/firebase/auth';
import { deleteBundle, listMyBundleableProducts, listMyBundles, saveBundle } from '@/app/actions/marketplace/bundle-actions';
import { formatBundleOffer, isBundleLive } from '@/lib/bundles';
import type { FixedPriceBundle } from '@/types/bundles';
import { cn } from '@/lib/utils/ui';

interface PickProduct { id: string; title: string; price: number; category: string; image: string; quantity: number }

const CATEGORIES = ['Collector Cards', 'Sneakers', 'Apparel', 'Accessories'];

interface FormState {
    id?: string;
    name: string;
    description: string;
    quantity: string;
    price: string;
    listingIds: string[];
    category: string;
    tag: string;
    isActive: boolean;
    startsAt: string;
    endsAt: string;
    maxPerCustomer: string;
}

const EMPTY: FormState = {
    name: '', description: '', quantity: '5', price: '', listingIds: [], category: '', tag: '',
    isActive: true, startsAt: '', endsAt: '', maxPerCustomer: '',
};

const toDateInput = (v: any) => (v ? String(v).slice(0, 10) : '');

export default function SellerBundlesClient() {
    const { user, isUserLoading } = useUser();
    const router = useRouter();
    const { toast } = useToast();
    const [bundles, setBundles] = useState<FixedPriceBundle[]>([]);
    const [products, setProducts] = useState<PickProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState<FormState | null>(null);
    const [saving, setSaving] = useState(false);
    const [filter, setFilter] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const token = await getCurrentUserIdToken();
            if (!token) return;
            const [b, p] = await Promise.all([listMyBundles(token), listMyBundleableProducts(token)]);
            setBundles(b);
            setProducts(p);
        } catch (e: any) {
            toast({ title: 'Could not load bundles', description: e?.message, variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        if (isUserLoading) return;
        if (!user) { router.replace('/sign-in?redirect=/seller/bundles'); return; }
        load();
    }, [user, isUserLoading, router, load]);

    const visibleProducts = useMemo(() => {
        const q = filter.trim().toLowerCase();
        return q ? products.filter(p => p.title.toLowerCase().includes(q)) : products;
    }, [products, filter]);

    const update = (patch: Partial<FormState>) => setForm(f => (f ? { ...f, ...patch } : f));
    const togglePick = (id: string) => setForm(f => f ? ({
        ...f, listingIds: f.listingIds.includes(id) ? f.listingIds.filter(x => x !== id) : [...f.listingIds, id],
    }) : f);

    const edit = (b: FixedPriceBundle) => setForm({
        id: b.id, name: b.name, description: b.description || '', quantity: String(b.quantity), price: String(b.price),
        listingIds: b.listingIds || [], category: b.category || '', tag: b.tag || '', isActive: b.isActive,
        startsAt: toDateInput(b.startsAt), endsAt: toDateInput(b.endsAt),
        maxPerCustomer: b.maxPerCustomer ? String(b.maxPerCustomer) : '',
    });

    const save = async () => {
        if (!form) return;
        setSaving(true);
        try {
            const token = await getCurrentUserIdToken();
            if (!token) throw new Error('Please sign in again.');
            const res = await saveBundle(token, {
                ...form,
                quantity: Number(form.quantity),
                price: Number(form.price),
                category: form.category || null,
                tag: form.tag || null,
                startsAt: form.startsAt || null,
                endsAt: form.endsAt ? `${form.endsAt}T23:59:59` : null,
                maxPerCustomer: form.maxPerCustomer ? Number(form.maxPerCustomer) : null,
            }, form.id);
            if (!res.success) throw new Error(res.error);
            toast({ title: form.id ? 'Bundle updated' : 'Bundle created' });
            setForm(null);
            load();
        } catch (e: any) {
            toast({ title: 'Could not save bundle', description: e?.message, variant: 'destructive' });
        } finally {
            setSaving(false);
        }
    };

    const remove = async (b: FixedPriceBundle) => {
        if (!confirm(`Delete the bundle "${b.name}"?`)) return;
        const token = await getCurrentUserIdToken();
        const res = await deleteBundle(token || '', b.id);
        if (!res.success) toast({ title: 'Could not delete', description: res.error, variant: 'destructive' });
        load();
    };

    const pickedValue = form ? products.filter(p => form.listingIds.includes(p.id)).sort((a, b) => b.price - a.price).slice(0, Number(form.quantity) || 0).reduce((a, p) => a + p.price, 0) : 0;

    return (
        <div className="container mx-auto max-w-4xl px-4 py-8 pb-32">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground"><Link href="/seller/dashboard" className="underline">Seller dashboard</Link></p>
                    <h1 className="text-3xl font-black tracking-tight">Bundles</h1>
                    <p className="text-sm text-muted-foreground">Sell several items for one fixed price, e.g. &quot;any 5 cards for $20&quot;.</p>
                </div>
                {!form && (
                    <Button onClick={() => setForm({ ...EMPTY })} className="min-h-11 gap-2"><Plus className="h-4 w-4" /> New bundle</Button>
                )}
            </div>

            {form ? (
                <div className="space-y-6 rounded-2xl border p-4 md:p-6">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2 sm:col-span-2">
                            <Label htmlFor="b-name">Bundle name</Label>
                            <Input id="b-name" value={form.name} maxLength={80} placeholder="Any 5 base cards" onChange={e => update({ name: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="b-qty">Number of items (N)</Label>
                            <Input id="b-qty" inputMode="numeric" value={form.quantity} onChange={e => update({ quantity: e.target.value.replace(/[^0-9]/g, '') })} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="b-price">Bundle price (AUD)</Label>
                            <Input id="b-price" inputMode="decimal" value={form.price} placeholder="20" onChange={e => update({ price: e.target.value.replace(/[^0-9.]/g, '') })} />
                        </div>
                        <div className="space-y-2 sm:col-span-2">
                            <Label htmlFor="b-desc">Description <span className="text-muted-foreground">(optional)</span></Label>
                            <Textarea id="b-desc" rows={2} maxLength={500} value={form.description} onChange={e => update({ description: e.target.value })} />
                        </div>
                    </div>

                    <fieldset className="space-y-3">
                        <legend className="font-bold">Which items count?</legend>
                        <p className="text-xs text-muted-foreground">Pick listings below, and/or add a rule. If a buyer adds more than N eligible items, the most expensive ones are bundled first, and each further N items makes another bundle.</p>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="b-cat">All my listings in category</Label>
                                <select id="b-cat" className="h-11 w-full rounded-md border bg-background px-3 text-sm" value={form.category} onChange={e => update({ category: e.target.value })}>
                                    <option value="">No category rule</option>
                                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="b-tag">All my listings matching tag / keyword</Label>
                                <Input id="b-tag" value={form.tag} placeholder="e.g. pokemon" onChange={e => update({ tag: e.target.value })} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2">
                                <Label htmlFor="b-filter">Pick listings ({form.listingIds.length} selected)</Label>
                                <Input id="b-filter" className="h-9 max-w-xs" placeholder="Filter" value={filter} onChange={e => setFilter(e.target.value)} />
                            </div>
                            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : products.length === 0 ? (
                                <p className="text-sm text-muted-foreground">You have no available listings yet.</p>
                            ) : (
                                <ul className="grid max-h-96 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
                                    {visibleProducts.map(p => {
                                        const on = form.listingIds.includes(p.id);
                                        return (
                                            <li key={p.id}>
                                                <button type="button" aria-pressed={on} onClick={() => togglePick(p.id)}
                                                    className={cn('flex w-full min-h-16 items-center gap-2 rounded-xl border-2 p-2 text-left text-xs', on ? 'border-primary bg-primary/10' : 'border-border')}>
                                                    <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-muted">
                                                        {p.image && <Image src={p.image} alt="" fill sizes="48px" className="object-cover" />}
                                                    </span>
                                                    <span className="min-w-0">
                                                        <span className="line-clamp-2 font-semibold">{p.title}</span>
                                                        <span className="text-muted-foreground">${p.price}</span>
                                                    </span>
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                            {form.listingIds.length > 0 && Number(form.price) > 0 && pickedValue > 0 && (
                                <p className="text-xs text-muted-foreground">Your {Math.min(form.listingIds.length, Number(form.quantity) || 0)} most expensive picks are worth ${pickedValue.toFixed(2)} individually{pickedValue <= Number(form.price) ? ' - the bundle price is higher, so it would not apply to them.' : '.'}</p>
                            )}
                        </div>
                    </fieldset>

                    <div className="grid gap-4 sm:grid-cols-3">
                        <div className="space-y-2">
                            <Label htmlFor="b-start">Starts <span className="text-muted-foreground">(optional)</span></Label>
                            <Input id="b-start" type="date" value={form.startsAt} onChange={e => update({ startsAt: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="b-end">Ends <span className="text-muted-foreground">(optional)</span></Label>
                            <Input id="b-end" type="date" value={form.endsAt} onChange={e => update({ endsAt: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="b-max">Max per customer</Label>
                            <Input id="b-max" inputMode="numeric" placeholder="Unlimited" value={form.maxPerCustomer} onChange={e => update({ maxPerCustomer: e.target.value.replace(/[^0-9]/g, '') })} />
                        </div>
                    </div>

                    <label className="flex min-h-11 items-center justify-between gap-4 rounded-xl border p-4">
                        <span className="font-semibold">Active</span>
                        <Switch checked={form.isActive} onCheckedChange={v => update({ isActive: v })} aria-label="Bundle active" />
                    </label>

                    <div className="flex gap-3">
                        <Button variant="outline" className="h-12 flex-1" onClick={() => setForm(null)} disabled={saving}>Cancel</Button>
                        <Button className="h-12 flex-[2]" onClick={save} disabled={saving}>
                            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save bundle
                        </Button>
                    </div>
                </div>
            ) : loading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
            ) : bundles.length === 0 ? (
                <div className="rounded-2xl border border-dashed p-8 text-center">
                    <Package className="mx-auto mb-3 h-10 w-10 text-muted-foreground" aria-hidden />
                    <p className="font-semibold">No bundles yet</p>
                    <p className="text-sm text-muted-foreground">Create one to sell several cards for a single price.</p>
                </div>
            ) : (
                <ul className="space-y-3">
                    {bundles.map(b => (
                        <li key={b.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4">
                            <div>
                                <p className="font-black">{formatBundleOffer(b)}: {b.name}</p>
                                <p className="text-xs text-muted-foreground">
                                    {isBundleLive(b) ? 'Live' : b.isActive ? 'Scheduled / expired' : 'Paused'}
                                    {' · '}{b.listingIds?.length || 0} picked{b.category ? ` · all ${b.category}` : ''}{b.tag ? ` · tag "${b.tag}"` : ''}
                                    {' · '}used {b.timesUsed || 0}x
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" className="min-h-11 gap-1" onClick={() => edit(b)}><Pencil className="h-4 w-4" /> Edit</Button>
                                <Button variant="ghost" size="sm" className="min-h-11" aria-label={`Delete ${b.name}`} onClick={() => remove(b)}><Trash2 className="h-4 w-4" /></Button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
