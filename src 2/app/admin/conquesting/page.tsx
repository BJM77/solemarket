'use client';

import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Target, Zap, TrendingUp, Users, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import competitors from "@/content/conquesting/competitors.json";

export default function ConquestingAdminPage() {
    return (
        <div className="container mx-auto py-8 space-y-8">
            <PageHeader
                title="Competitor Conquesting"
                description="Targeted landing pages to capture 'Buy' intent from competitor shoppers and convert them into Benched sellers."
            />

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Card className="bg-primary/5 border-primary/20">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Target className="h-5 w-5 text-primary" />
                            Active Campaigns
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{Object.keys(competitors).length}</div>
                        <p className="text-xs text-muted-foreground mt-1">Dynamic landing pages live</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-accent" />
                            Conversion Strategy
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-bold">Sell-to-Buy</div>
                        <p className="text-xs text-muted-foreground mt-1">Fund new purchases by selling old gear</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Zap className="h-5 w-5 text-yellow-500" />
                            Status
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Badge variant="default" className="bg-green-500">Live & Optimizing</Badge>
                        <p className="text-xs text-muted-foreground mt-1">SEO dynamic routes active</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Manage Landing Pages</CardTitle>
                    <CardDescription>
                        These pages are designed to rank for "Shop at [Competitor]" searches and offer a better alternative.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <div className="grid grid-cols-12 gap-4 p-4 font-bold border-b bg-muted/50">
                            <div className="col-span-4">Competitor</div>
                            <div className="col-span-5">Target URL</div>
                            <div className="col-span-3 text-right">Action</div>
                        </div>
                        {Object.entries(competitors).map(([slug, data]: [string, any]) => (
                            <div key={slug} className="grid grid-cols-12 gap-4 p-4 items-center border-b last:border-0 hover:bg-muted/30 transition-colors">
                                <div className="col-span-4 flex items-center gap-3">
                                    <div 
                                        className="w-2 h-8 rounded-full" 
                                        style={{ backgroundColor: data.primaryColor }}
                                    />
                                    <div>
                                        <div className="font-bold">{data.name}</div>
                                        <div className="text-[10px] uppercase text-muted-foreground font-mono">{slug}</div>
                                    </div>
                                </div>
                                <div className="col-span-5">
                                    <code className="text-xs bg-muted px-2 py-1 rounded">/shop-at/{slug}</code>
                                </div>
                                <div className="col-span-3 text-right">
                                    <Button variant="outline" size="sm" asChild>
                                        <Link href={`/shop-at/${slug}`} target="_blank">
                                            View Page <ExternalLink className="ml-2 h-3 w-3" />
                                        </Link>
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-8">
                <Card className="border-2 border-dashed border-muted-foreground/20 bg-muted/5 flex flex-col items-center justify-center p-12 text-center">
                    <Users className="h-12 w-12 text-muted-foreground/40 mb-4" />
                    <h3 className="text-xl font-bold mb-2">Add New Competitor</h3>
                    <p className="text-sm text-muted-foreground mb-6 max-w-xs">
                        Expand your conquesting reach by targeting new retailers and marketplaces.
                    </p>
                    <Button variant="outline" disabled>
                        Launch New Campaign (Coming Soon)
                    </Button>
                </Card>

                <Card className="p-8 bg-gradient-to-br from-slate-900 to-slate-800 text-white border-0 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500">
                        <Target className="h-32 w-32" />
                    </div>
                    <h3 className="text-2xl font-black mb-4 relative z-10 italic">Premium Strategy</h3>
                    <p className="text-slate-300 mb-8 relative z-10">
                        Current strategy is focused on "Sell-to-Buy" psychology, targeting high-intent shoppers at major Australian retailers.
                    </p>
                    <div className="flex items-center gap-4 relative z-10">
                        <div className="p-3 bg-white/10 rounded-xl backdrop-blur-md border border-white/10">
                            <span className="block text-xs uppercase font-bold text-slate-400 mb-1">Targeting</span>
                            <span className="font-bold">AU Retailers</span>
                        </div>
                        <ArrowRight className="text-slate-500" />
                        <div className="p-3 bg-white/10 rounded-xl backdrop-blur-md border border-white/10">
                            <span className="block text-xs uppercase font-bold text-slate-400 mb-1">Conversion</span>
                            <span className="font-bold">Zero Fee Promo</span>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
}
