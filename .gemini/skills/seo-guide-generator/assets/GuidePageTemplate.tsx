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
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-20">
            {/* Hero Section */}
            <section className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 py-16 px-4">
                <div className="max-w-4xl mx-auto text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-bold mb-6">
                        <Info className="h-4 w-4" />
                        Collector's Guide
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white tracking-tight mb-6">
                        {content.title}
                    </h1>
                    <p className="text-xl text-slate-500 dark:text-slate-400 leading-relaxed max-w-2xl mx-auto">
                        Everything you need to know about history, value, and collecting strategy.
                    </p>
                </div>
            </section>

            <div className="max-w-7xl mx-auto px-4 mt-12 grid grid-cols-1 lg:grid-cols-12 gap-12">
                {/* Main Content */}
                <div className="lg:col-span-8 space-y-12">
                    {/* History */}
                    <section className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-sm">
                        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                            History & Significance
                        </h2>
                        <div className="prose dark:prose-invert max-w-none text-slate-600 dark:text-slate-300">
                            <p className="whitespace-pre-line">{content.history}</p>
                        </div>
                    </section>

                    {/* Investment Profile */}
                    <section className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-sm border-l-4 border-emerald-500">
                        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                            <TrendingUp className="h-6 w-6" />
                            Investment Profile
                        </h2>
                        <div className="prose dark:prose-invert max-w-none text-slate-600 dark:text-slate-300">
                            <p className="whitespace-pre-line">{content.investmentProfile}</p>
                        </div>
                    </section>

                    {/* Key Items */}
                    <section>
                        <h2 className="text-2xl font-bold mb-6">Key Items to Watch</h2>
                        <div className="grid gap-6">
                            {content.keyItems.map((item, i) => (
                                <div key={i} className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                                    <div>
                                        <h3 className="font-bold text-lg text-slate-900 dark:text-white">{item.name}</h3>
                                        <p className="text-slate-500 text-sm mt-1">{item.description}</p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <div className="text-xs text-slate-400 uppercase font-bold tracking-wider">Est. Value</div>
                                        <div className="text-lg font-mono font-bold text-emerald-600">{item.approxValue}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Live Listings */}
                    <section id="listings">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold">Active Listings</h2>
                            <Button asChild variant="outline">
                                <Link href="/browse">View All <ArrowRight className="h-4 w-4 ml-2" /></Link>
                            </Button>
                        </div>
                        {relatedProducts.length > 0 ? (
                            <ProductGrid products={relatedProducts} />
                        ) : (
                            <div className="text-center py-12 bg-slate-100 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                                <p className="text-slate-500">No active listings found for this specific category right now.</p>
                                <Button asChild className="mt-4">
                                    <Link href="/sell/create">Be the first to list one!</Link>
                                </Button>
                            </div>
                        )}
                    </section>

                    {/* FAQ */}
                    <section className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-sm">
                        <h2 className="text-2xl font-bold mb-6">Frequently Asked Questions</h2>
                        <div className="space-y-6">
                            {content.faq.map((item, i) => (
                                <div key={i}>
                                    <h3 className="font-bold text-slate-900 dark:text-white mb-2">{item.question}</h3>
                                    <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">{item.answer}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>

                {/* Sidebar */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="sticky top-24">
                        <div className="bg-primary/5 rounded-2xl p-6 border border-primary/10">
                            <h3 className="font-bold text-lg mb-2 text-primary">Ready to Sell?</h3>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                                The market for <strong>{content.title}</strong> is active. List your items today for 0% fees on your first sale.
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
