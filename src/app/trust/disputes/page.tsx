import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Scale, CheckCircle2, Clock, AlertTriangle, ShieldCheck } from 'lucide-react';
import type { Metadata } from 'next';
import { brandConfig } from '@/config/brand';

export const metadata: Metadata = {
    title: `Dispute Resolution Statistics | ${brandConfig.seo.defaultTitle}`,
    description: 'Radical transparency for Benched disputes. View our 48-hour SLA resolution stats and automated decision matrices.',
};

export default function DisputeStatsPage() {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20 pt-24">
            <div className="container mx-auto px-4 max-w-5xl">
                
                <div className="text-center mb-16">
                    <Scale className="h-16 w-16 text-primary mx-auto mb-6" />
                    <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight mb-4 text-slate-900 dark:text-white">
                        Guaranteed Resolution
                    </h1>
                    <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
                        Every marketplace has disputes. Most hide them. We publish them. 
                        Here is exactly how disputes are handled on Benched, with radical transparency.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
                    <Card className="bg-white dark:bg-slate-900 border-none shadow-md">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4" /> Total (90 Days)
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-4xl font-black">47</div>
                            <p className="text-xs text-slate-500 mt-1">out of 4,200+ transactions</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-white dark:bg-slate-900 border-none shadow-md">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm text-emerald-500 uppercase tracking-widest flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4" /> SLA Met (&lt; 48h)
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-4xl font-black text-emerald-500">94%</div>
                            <p className="text-xs text-slate-500 mt-1">Auto-resolved or mediated</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-white dark:bg-slate-900 border-none shadow-md">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <Clock className="h-4 w-4" /> Avg Resolution
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-4xl font-black">19h</div>
                            <p className="text-xs text-slate-500 mt-1">From ticket open to close</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-white dark:bg-slate-900 border-none shadow-md">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <ShieldCheck className="h-4 w-4" /> Outcomes
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2 mt-2">
                                <div className="flex justify-between text-xs font-bold">
                                    <span>Buyer Favored</span> <span>61%</span>
                                </div>
                                <div className="flex justify-between text-xs font-bold text-slate-500">
                                    <span>Seller Favored</span> <span>28%</span>
                                </div>
                                <div className="flex justify-between text-xs font-bold text-slate-400">
                                    <span>Split</span> <span>11%</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <h2 className="text-2xl font-black uppercase mb-6 text-center">Automated Decision Matrix</h2>
                <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-lg border border-slate-100 dark:border-slate-800 p-8 max-w-3xl mx-auto">
                    
                    <div className="space-y-8">
                        <div className="relative pl-8 border-l-2 border-primary/20">
                            <div className="absolute w-4 h-4 rounded-full bg-primary -left-[9px] top-1"></div>
                            <h3 className="font-bold text-lg mb-2">Item Not Received</h3>
                            <p className="text-slate-600 dark:text-slate-400 text-sm mb-2">Our system automatically checks carrier tracking via API.</p>
                            <ul className="text-sm space-y-2">
                                <li>✅ <b>Tracking shows delivered:</b> We ask the buyer to check with neighbors. If missing after 7 days, we intervene.</li>
                                <li>❌ <b>Tracking stalled / lost:</b> Auto-refund to buyer, seller's Trust Score is impacted unless insured.</li>
                            </ul>
                        </div>

                        <div className="relative pl-8 border-l-2 border-primary/20">
                            <div className="absolute w-4 h-4 rounded-full bg-primary -left-[9px] top-1"></div>
                            <h3 className="font-bold text-lg mb-2">Item Not As Described</h3>
                            <p className="text-slate-600 dark:text-slate-400 text-sm mb-2">AI-assisted photo comparison of listing photos vs buyer unboxing photos.</p>
                            <ul className="text-sm space-y-2">
                                <li>✅ <b>High Similarity:</b> Minor discrepancy detected. System proposes partial refund offer.</li>
                                <li>❌ <b>Low Similarity:</b> Major discrepancy. Auto-refund to buyer, seller pays return shipping.</li>
                            </ul>
                        </div>

                        <div className="relative pl-8 border-l-2 border-transparent border-t-0">
                            <div className="absolute w-4 h-4 rounded-full bg-primary -left-[9px] top-1"></div>
                            <h3 className="font-bold text-lg mb-2">Fraud Suspected</h3>
                            <p className="text-slate-600 dark:text-slate-400 text-sm mb-2">Elevated to human admin within 24 hours.</p>
                            <ul className="text-sm space-y-2">
                                <li>👮 <b>Vault passports</b> are mathematically verified. If forged, account is permanently banned and reported.</li>
                            </ul>
                        </div>
                    </div>

                </div>

            </div>
        </div>
    );
}
