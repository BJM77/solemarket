'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getTopSellers } from '@/lib/firebase/firestore';
import { getProducts } from '@/services/product-service';
import type { Seller, Product } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Star, ShieldCheck, ChevronRight, TrendingUp, Store, ShoppingBag } from 'lucide-react';
import { cn, formatPrice, getProductUrl } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface StoreWithProducts extends Seller {
    products: Product[];
}

function StoreRowSkeleton() {
    return (
        <div className="py-8 border-b border-border/50">
            <div className="flex flex-col lg:flex-row gap-8 items-start">
                <div className="w-full lg:w-72 shrink-0">
                    <div className="flex items-center gap-4 mb-4">
                        <Skeleton className="h-16 w-16 rounded-full" />
                        <div className="space-y-2">
                            <Skeleton className="h-6 w-32" />
                            <Skeleton className="h-4 w-24" />
                        </div>
                    </div>
                    <Skeleton className="h-10 w-full" />
                </div>
                <div className="flex-1 w-full overflow-hidden">
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        {[...Array(5)].map((_, i) => (
                            <Skeleton key={i} className="aspect-square rounded-xl" />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

function ComingSoonRow({ index }: { index: number }) {
    return (
        <div className="py-12 border-b border-border/50 opacity-40 grayscale group hover:grayscale-0 hover:opacity-70 transition-all duration-500">
            <div className="flex flex-col lg:flex-row gap-8 items-center lg:items-start text-center lg:text-left">
                <div className="w-full lg:w-72 shrink-0 flex flex-col items-center lg:items-start">
                    <div className="relative mb-4">
                        <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center border-2 border-dashed border-muted-foreground/30">
                            <Store className="h-8 w-8 text-muted-foreground/40" />
                        </div>
                        <div className="absolute -top-2 -right-2 bg-muted-foreground/20 text-[10px] font-bold px-2 py-0.5 rounded-full border border-muted-foreground/10">
                            #{index}
                        </div>
                    </div>
                    <h3 className="text-xl font-black uppercase tracking-tighter text-muted-foreground/60 mb-1">Coming Soon</h3>
                    <p className="text-sm text-muted-foreground/40 mb-4">Space reserved for Top Seller</p>
                    <Button variant="ghost" disabled size="sm" className="rounded-full border-dashed">
                        Application Pending
                    </Button>
                </div>
                <div className="flex-1 w-full">
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 opacity-30">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="aspect-square rounded-2xl bg-muted border-2 border-dashed border-muted-foreground/20 flex items-center justify-center">
                                <ShoppingBag className="h-6 w-6 text-muted-foreground/20" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

function StoreRow({ store }: { store: StoreWithProducts }) {
    const shopUrl = store.shopSlug ? `/shop/${store.shopSlug}` : `/shop/${store.id}`;

    return (
        <div className="py-10 border-b border-border/50 group">
            <div className="flex flex-col lg:flex-row gap-8 items-start">
                {/* Store Info */}
                <div className="w-full lg:w-72 shrink-0">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="relative">
                            <Avatar className="h-20 w-20 border-4 border-background shadow-xl group-hover:scale-105 transition-transform duration-500">
                                <AvatarImage src={store.avatarUrl} alt={store.displayName} />
                                <AvatarFallback className="text-2xl font-black">{store.displayName[0]}</AvatarFallback>
                            </Avatar>
                            <div className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground text-[10px] font-black h-6 w-6 rounded-full flex items-center justify-center border-2 border-background shadow-lg">
                                1
                            </div>
                        </div>
                        <div>
                            <Link href={shopUrl} className="hover:underline decoration-primary decoration-2 underline-offset-4">
                                <h3 className="text-2xl font-black uppercase tracking-tighter leading-none flex items-center gap-1">
                                    {store.displayName}
                                    <ShieldCheck className="h-5 w-5 text-blue-500 shrink-0" />
                                </h3>
                            </Link>
                            <div className="flex items-center gap-2 mt-2">
                                <div className="flex items-center gap-1 bg-yellow-400/10 px-2 py-0.5 rounded-full border border-yellow-400/20">
                                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                    <span className="text-xs font-bold text-yellow-700">{store.rating.toFixed(1)}</span>
                                </div>
                                <span className="text-xs text-muted-foreground font-medium">{store.totalSales}+ Sales</span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <Button className="w-full rounded-full h-11 font-bold tracking-tight shadow-lg shadow-primary/10 hover:shadow-primary/20 transition-all duration-300 group/btn" asChild>
                            <Link href={shopUrl}>
                                Enter Storefront
                                <ChevronRight className="ml-2 h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                            </Link>
                        </Button>
                        <p className="text-[10px] text-center text-muted-foreground uppercase tracking-widest font-bold">Trusted Partner since 2024</p>
                    </div>
                </div>

                {/* Product Preview */}
                <div className="flex-1 w-full overflow-hidden">
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        {store.products.length > 0 ? (
                            store.products.slice(0, 5).map((product) => (
                                <Link
                                    key={product.id}
                                    href={getProductUrl(product)}
                                    className="group/product relative aspect-square rounded-2xl overflow-hidden bg-muted border border-border/40 hover:border-primary/50 transition-all duration-500 shadow-sm hover:shadow-xl"
                                >
                                    <img
                                        src={product.imageUrls[0]}
                                        alt={product.title}
                                        className="w-full h-full object-cover group-hover/product:scale-110 transition-transform duration-700"
                                    />
                                    <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover/product:opacity-100 transition-opacity duration-300">
                                        <p className="text-[10px] text-white font-bold truncate">{product.title}</p>
                                        <p className="text-xs text-primary font-black">${formatPrice(product.price)}</p>
                                    </div>
                                    <div className="absolute top-2 right-2 flex gap-1">
                                        {product.status === 'sold' && (
                                            <Badge className="bg-primary text-white text-[8px] font-black py-0 px-1">SOLD</Badge>
                                        )}
                                    </div>
                                </Link>
                            ))
                        ) : (
                            <div className="col-span-full h-full flex items-center justify-center p-12 bg-muted/30 rounded-3xl border border-dashed border-border">
                                <p className="text-muted-foreground font-medium italic">Preparing latest inventory...</p>
                            </div>
                        )}

                        {/* If less than 5 products, show fill-ins? No, the user said 5 products. I'll just show what's there. */}
                        {store.products.length > 0 && store.products.length < 5 && [...Array(5 - store.products.length)].map((_, i) => (
                             <div key={`fill-${i}`} className="aspect-square rounded-2xl bg-muted/20 border border-dashed border-border/60 flex items-center justify-center hidden md:flex">
                                <ShoppingBag className="h-6 w-6 text-muted-foreground/10" />
                             </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function TopStoresPage() {
    const [stores, setStores] = useState<StoreWithProducts[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadStores = async () => {
            try {
                const topSellers = await getTopSellers(10);
                const sellersWithProducts = await Promise.all(
                    topSellers.map(async (seller) => {
                        const { products } = await getProducts({ sellers: [seller.id], limit: 5 });
                        return { ...seller, products };
                    })
                );
                setStores(sellersWithProducts);
            } catch (error) {
                console.error('Error loading top stores:', error);
            } finally {
                setLoading(false);
            }
        };

        loadStores();
    }, []);

    return (
        <main className="min-h-screen pt-20 pb-24 bg-background">
            {/* Hero Header */}
            <div className="container mx-auto px-4 mb-12">
                <div className="max-w-4xl mx-auto text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/5 border border-primary/10 text-primary mb-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <TrendingUp className="h-4 w-4" />
                        <span className="text-xs font-black uppercase tracking-widest leading-none">Market Leaders</span>
                    </div>
                    <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter mb-6 leading-[0.9] animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
                        Top 10 Stores<br />
                        <span className="text-primary italic">The Lineup</span>
                    </h1>
                    <p className="text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-12 duration-700 delay-200">
                        Ranking the best Australian sneaker and card boutiques based on inventory depth, successful trades, and community trust.
                    </p>
                </div>
            </div>

            {/* Scores Table */}
            <div className="container mx-auto px-4">
                <div className="max-w-6xl mx-auto bg-card border border-border/40 rounded-[2.5rem] shadow-2xl p-6 md:p-10">
                    <div className="flex items-center justify-between mb-8 pb-6 border-b border-border/50">
                        <h2 className="text-sm font-black uppercase tracking-[0.2em] text-muted-foreground/60">Verified Rankings</h2>
                        <div className="flex gap-4">
                             <div className="flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Live Stats</span>
                             </div>
                        </div>
                    </div>

                    {loading ? (
                        [...Array(3)].map((_, i) => <StoreRowSkeleton key={i} />)
                    ) : (
                        <>
                            {stores.map((store) => (
                                <StoreRow key={store.id} store={store} />
                            ))}
                            {[...Array(Math.max(0, 10 - stores.length))].map((_, i) => (
                                <ComingSoonRow key={`soon-${i}`} index={stores.length + i + 1} />
                            ))}
                        </>
                    )}
                </div>
            </div>

            {/* Bottom CTA */}
            <div className="container mx-auto px-4 mt-20 text-center">
                <div className="bg-slate-900 dark:bg-zinc-900 rounded-[2rem] p-10 md:p-16 text-white overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 blur-[100px] -mr-32 -mt-32" />
                    <div className="relative z-10">
                        <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter mb-4">Want to be on this list?</h2>
                        <p className="text-zinc-400 max-w-lg mx-auto mb-8 font-medium">Apply for a Business Account and start building your reputation on Australia's fastest growing marketplace.</p>
                        <Button size="lg" className="rounded-full px-8 h-12 font-bold bg-white text-black hover:bg-zinc-200" asChild>
                            <Link href="/sell">Apply Now</Link>
                        </Button>
                    </div>
                </div>
            </div>
        </main>
    );
}
