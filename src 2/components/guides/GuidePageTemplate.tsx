'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, Info, TrendingUp } from 'lucide-react';
import ProductGrid from '@/components/products/ProductGrid';
import type { Product } from '@/lib/types';

interface GuidePageProps {
    content: {
        title: string;
        history: string;
        investmentProfile: string;
        keyItems: Array<{ name: string; description: string; approxValue: string }>;
        faq: Array<{ question: string; answer: string }>;
    };
    relatedProducts: Product[];
}

export default function GuidePageTemplate({ content, relatedProducts }: GuidePageProps) {
    return (
        <div className="min-h-screen bg-background pb-20">
            {/* Hero Section */}
            <section className="bg-card border-b border-white/5 py-16 px-4">
                <div className="max-w-4xl mx-auto text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-bold mb-6">
                        <Info className="h-4 w-4" />
                        Collector's Guide
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight mb-6">
                        {content.title}
                    </h1>
                    <p className="text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
                        Everything you need to know about history, value, and collecting strategy.
                    </p>
                </div>
            </section>

            <div className="max-w-7xl mx-auto px-4 mt-12 grid grid-cols-1 lg:grid-cols-12 gap-12">
                {/* Main Content */}
                <div className="lg:col-span-8 space-y-12">
                    {/* History */}
                    <section className="bg-card border border-white/5 rounded-2xl p-8 shadow-sm">
                        <h2 className="text-2xl font-black uppercase tracking-tight mb-4 flex items-center gap-2 text-white">
                            History & Significance
                        </h2>
                        <div className="prose dark:prose-invert max-w-none text-muted-foreground">
                            <p className="whitespace-pre-line">{content.history}</p>
                        </div>
                    </section>

                    {/* Investment Profile */}
                    <section className="bg-card rounded-2xl p-8 shadow-sm border border-emerald-500/20 border-l-4 border-l-emerald-500">
                        <h2 className="text-2xl font-black uppercase tracking-tight mb-4 flex items-center gap-2 text-emerald-400">
                            <TrendingUp className="h-6 w-6" />
                            Investment Profile
                        </h2>
                        <div className="prose dark:prose-invert max-w-none text-muted-foreground">
                            <p className="whitespace-pre-line">{content.investmentProfile}</p>
                        </div>
                    </section>

                    {/* Key Items */}
                    <section>
                        <h2 className="text-2xl font-black uppercase tracking-tight mb-6 text-white">Key Items to Watch</h2>
                        <div className="grid gap-6">
                            {content.keyItems.map((item, i) => (
                                <div key={i} className="bg-white/5 border border-white/5 p-6 rounded-xl shadow-sm flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                                    <div>
                                        <h3 className="font-black text-lg text-white uppercase tracking-tight">{item.name}</h3>
                                        <p className="text-muted-foreground text-sm mt-1">{item.description}</p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <div className="text-xs text-muted-foreground uppercase font-black tracking-widest">Est. Value</div>
                                        <div className="text-lg font-mono font-black text-emerald-500">{item.approxValue}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Live Listings */}
                    <section id="listings">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-black uppercase tracking-tight text-white">Active Listings</h2>
                            <Button asChild variant="outline" className="border-white/10 hover:bg-white/5">
                                <Link href="/browse">View All <ArrowRight className="h-4 w-4 ml-2" /></Link>
                            </Button>
                        </div>
                        {relatedProducts.length > 0 ? (
                            <ProductGrid products={relatedProducts} />
                        ) : (
                            <div className="text-center py-12 bg-white/5 rounded-xl border border-dashed border-white/10">
                                <p className="text-muted-foreground">No active listings found for this specific category right now.</p>
                                <Button asChild className="mt-4 font-black">
                                    <Link href="/sell/create">Be the first to list one!</Link>
                                </Button>
                            </div>
                        )}
                    </section>

                    {/* FAQ */}
                    <section className="bg-card border border-white/5 rounded-2xl p-8 shadow-sm">
                        <h2 className="text-2xl font-black uppercase tracking-tight mb-6 text-white">Frequently Asked Questions</h2>
                        <div className="space-y-6">
                            {content.faq.map((item, i) => (
                                <div key={i}>
                                    <h3 className="font-black text-white mb-2">{item.question}</h3>
                                    <p className="text-muted-foreground text-sm leading-relaxed">{item.answer}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>

                {/* Sidebar */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="sticky top-24">
                        <div className="bg-primary/5 rounded-2xl p-6 border border-primary/10">
                            <h3 className="font-black uppercase tracking-tight text-lg mb-2 text-primary">Ready to Sell?</h3>
                            <p className="text-sm text-muted-foreground mb-6">
                                The market for <strong className="text-white">{content.title}</strong> is active. List your items today for 0% fees on your first sale.
                            </p>
                            <Button className="w-full font-bold" asChild>
                                <Link href="/sell/create">Start Selling</Link>
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
