'use client';

import { useState, useMemo, useEffect } from 'react';
import { useFirebase, useCollection, useUser, useMemoFirebase } from '@/firebase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Product } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { collection, query, where, Timestamp } from 'firebase/firestore';
import { Layers, Plus, Sparkles, TrendingUp, ExternalLink, Loader2 } from 'lucide-react';
import { getCurrentUserIdToken } from '@/lib/firebase/auth';
import { publishListing, saveDraftListing } from '@/app/actions/seller/sell';
import { priceCheckAction } from '@/app/actions/marketplace/price-check';
import { buildEbayAuSoldUrl } from '@/components/price-check/InlinePriceSuggestion';
import { useToast } from '@/hooks/use-toast';

export default function MyCollectionPage() {
    const { firestore } = useFirebase();
    const { user, isUserLoading } = useUser();
    const router = useRouter();
    const { toast } = useToast();

    const [prices, setPrices] = useState<Record<string, string>>({});
    const [estimates, setEstimates] = useState<Record<string, { median: number | null; count: number }>>({});
    const [busyId, setBusyId] = useState<string | null>(null);
    const [checkingId, setCheckingId] = useState<string | null>(null);

    useEffect(() => {
        if (!isUserLoading && !user) {
            router.push('/sign-in?redirect=/profile/collection');
        }
    }, [isUserLoading, user, router]);

    const sellerIdQuery = useMemoFirebase(() => {
        if (!firestore || !user?.uid) return null;
        return query(collection(firestore, 'products'), where('sellerId', '==', user.uid));
    }, [firestore, user?.uid]);

    const { data: allProducts, isLoading } = useCollection<Product>(sellerIdQuery);

    // Collection items = drafts or items not currently live for sale (excluding sold/deleted)
    const collectionItems = useMemo(() => {
        if (!allProducts) return [];
        return allProducts
            .filter((p) => p.status !== 'sold' && p.status !== 'deleted' && (p.isDraft || p.status === 'draft'))
            .sort((a, b) => {
                const dateA = a.createdAt instanceof Timestamp ? a.createdAt.toMillis() : new Date(a.createdAt as any || 0).getTime();
                const dateB = b.createdAt instanceof Timestamp ? b.createdAt.toMillis() : new Date(b.createdAt as any || 0).getTime();
                return dateB - dateA;
            });
    }, [allProducts]);

    const totalEstimatedValue = useMemo(() => {
        return collectionItems.reduce((sum, item) => {
            const est = estimates[item.id]?.median;
            const p = Number(prices[item.id] ?? item.price ?? est ?? 0);
            return sum + (p > 0 ? p : 0);
        }, 0);
    }, [collectionItems, estimates, prices]);

    const handleCheckValue = async (item: Product) => {
        setCheckingId(item.id);
        try {
            const token = (await getCurrentUserIdToken()) ?? '';
            const res = await priceCheckAction(token, {
                query: item.title,
                category: item.category,
                condition: item.condition,
                productId: item.id,
            });
            if (res.success) {
                setEstimates((prev) => ({
                    ...prev,
                    [item.id]: { median: res.result.median, count: res.result.sampleSize },
                }));
                if (res.result.median != null && !(Number(prices[item.id] ?? item.price) > 0)) {
                    setPrices((prev) => ({ ...prev, [item.id]: String(res.result.median) }));
                }
            } else {
                toast({ title: 'Could not check value', description: res.error, variant: 'destructive' });
            }
        } finally {
            setCheckingId(null);
        }
    };

    const handleFlipToSell = async (item: Product) => {
        const rawPrice = prices[item.id] !== undefined ? Number(prices[item.id]) : Number(item.price);
        if (!(rawPrice > 0)) {
            toast({
                title: 'Enter a price first',
                description: 'Set an asking price above $0 to flip this card to live for sale.',
                variant: 'destructive',
            });
            return;
        }
        setBusyId(item.id);
        try {
            const token = (await getCurrentUserIdToken()) ?? '';
            await saveDraftListing(
                token,
                {
                    title: item.title,
                    price: rawPrice,
                    condition: item.condition || 'Near Mint',
                    category: item.category || 'Collector Cards',
                } as any,
                item.id
            );
            await publishListing(item.id, token);
            toast({
                title: 'Flipped to For Sale!',
                description: `"${item.title}" is now live on the marketplace for $${rawPrice.toFixed(2)}.`,
            });
        } catch (e: any) {
            toast({
                title: 'Could not publish',
                description: e?.message || 'Try editing the full listing first.',
                variant: 'destructive',
            });
        } finally {
            setBusyId(null);
        }
    };

    if (isUserLoading || isLoading) {
        return (
            <div className="py-12 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!user) return null;

    return (
        <div className="space-y-6" data-testid="my-collection-page">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight font-headline">My Collection & Vault</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Scan cards into your collection, check rough sold values, and flip any card to live For Sale in one tap.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {totalEstimatedValue > 0 && (
                        <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-2 text-right">
                            <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Est. Collection Value</span>
                            <span className="text-lg font-black text-primary">${totalEstimatedValue.toFixed(2)} AUD</span>
                        </div>
                    )}
                    <Button asChild>
                        <Link href="/sell/fast-bulk">
                            <Plus className="h-4 w-4 mr-1.5" /> Scan Cards
                        </Link>
                    </Button>
                </div>
            </div>

            {collectionItems.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border p-12 text-center space-y-4">
                    <Layers className="h-12 w-12 mx-auto text-muted-foreground" />
                    <div className="space-y-1">
                        <h2 className="text-xl font-bold">Your collection is empty</h2>
                        <p className="text-sm text-muted-foreground max-w-md mx-auto">
                            Scan cards or save drafts without publishing them right away. Track their rough market value here and flip them to For Sale whenever you&apos;re ready.
                        </p>
                    </div>
                    <div className="flex justify-center gap-2">
                        <Button asChild>
                            <Link href="/sell/fast-bulk">Scan a Stack of Cards</Link>
                        </Button>
                        <Button variant="outline" asChild>
                            <Link href="/sell/create">Add Single Item</Link>
                        </Button>
                    </div>
                </div>
            ) : (
                <ul className="grid gap-4 sm:grid-cols-2">
                    {collectionItems.map((item) => {
                        const currentPrice = prices[item.id] !== undefined ? prices[item.id] : (item.price > 0 ? String(item.price) : '');
                        const est = estimates[item.id];
                        return (
                            <li key={item.id} className="rounded-2xl border border-border bg-card p-4 flex gap-4 items-start">
                                {item.imageUrls?.[0] ? (
                                    <img
                                        src={item.imageUrls[0]}
                                        alt={item.title}
                                        className="h-28 w-20 rounded-xl object-cover bg-muted shrink-0"
                                        loading="lazy"
                                    />
                                ) : (
                                    <div className="h-28 w-20 rounded-xl bg-muted shrink-0" />
                                )}
                                <div className="flex-1 min-w-0 space-y-2.5">
                                    <div>
                                        <div className="flex items-center gap-1.5 flex-wrap mb-1">
                                            <Badge variant="secondary" className="text-[10px]">In Collection</Badge>
                                            {item.condition && <Badge variant="outline" className="text-[10px]">{item.condition}</Badge>}
                                        </div>
                                        <h3 className="font-bold text-sm leading-snug truncate" title={item.title}>{item.title}</h3>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2 text-xs">
                                        {est ? (
                                            est.median != null ? (
                                                <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                                                    Est. value: ${est.median.toFixed(2)} ({est.count} comps)
                                                </span>
                                            ) : (
                                                <span className="text-muted-foreground">No direct Benched comps yet</span>
                                            )
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => handleCheckValue(item)}
                                                disabled={checkingId === item.id}
                                                className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
                                            >
                                                {checkingId === item.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <TrendingUp className="h-3 w-3" />}
                                                Check rough value
                                            </button>
                                        )}
                                        {item.title && (
                                            <a
                                                href={buildEbayAuSoldUrl(item.title)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-0.5 text-muted-foreground hover:text-primary underline ml-auto"
                                            >
                                                eBay Sold <ExternalLink className="h-3 w-3" />
                                            </a>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2 pt-1">
                                        <div className="relative w-28">
                                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                min="1"
                                                placeholder="Price"
                                                value={currentPrice}
                                                onChange={(e) => setPrices((prev) => ({ ...prev, [item.id]: e.target.value }))}
                                                className="h-9 pl-6 text-xs"
                                                aria-label={`Price for ${item.title}`}
                                            />
                                        </div>
                                        <Button
                                            size="sm"
                                            className="h-9 font-bold gap-1.5 flex-1"
                                            disabled={busyId === item.id}
                                            onClick={() => handleFlipToSell(item)}
                                            data-testid={`flip-to-sell-${item.id}`}
                                        >
                                            {busyId === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                                            Flip to Sell
                                        </Button>
                                        <Button variant="ghost" size="sm" className="h-9 px-2 text-xs" asChild>
                                            <Link href={`/sell/create?edit=${item.id}`}>Edit</Link>
                                        </Button>
                                    </div>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}

