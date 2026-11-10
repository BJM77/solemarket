import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Search, Zap, BarChart3, Store, Lock, Globe, Sparkles } from "lucide-react";
import { PartnerContactForm } from "@/components/partners/PartnerContactForm";
import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Card Shops & Hobby Store Partners | Benched Australia",
    description: "Exclusive partnership program for Australian card shops, sneaker boutiques, and verified hobby sellers. Fast listing, local collectors, zero listing fees.",
    robots: {
        index: false, // Keep hidden / unindexed until publicly announced
        follow: false,
    },
};

export default function PartnersPage() {
    return (
        <div className="min-h-screen bg-background">
            {/* Hero Section */}
            <section className="relative py-20 px-6 lg:px-8 bg-gradient-to-b from-primary/5 to-background overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full bg-[url('/grid-pattern.svg')] opacity-10 pointer-events-none" />
                <div className="container mx-auto max-w-6xl relative z-10">
                    <div className="flex flex-col lg:flex-row items-center gap-12">
                        <div className="lg:w-1/2 space-y-6 text-center lg:text-left">
                            <Badge variant="secondary" className="px-3 py-1 text-sm font-medium border-primary/20 bg-primary/10 text-primary mb-2">
                                Store Program • Australian Card & Sneaker Shops
                            </Badge>
                            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight font-headline text-foreground">
                                Turn Your Showcases <br />
                                <span className="text-primary">Into Direct Sales.</span>
                            </h1>
                            <p className="text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0">
                                The Australian digital storefront built specifically for card shops, sneaker stores, and volume hobbyists.
                                Fast bulk listing, direct PayID payments, and reach Australian collectors with zero middleman friction.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                                <Button size="lg" className="text-base px-8 shadow-lg shadow-primary/20 h-12" asChild>
                                    <Link href="#contact">Apply for Partner Access</Link>
                                </Button>
                                <Button size="lg" variant="outline" className="text-base h-12" asChild>
                                    <Link href="#features">Explore Benefits</Link>
                                </Button>
                            </div>
                        </div>
                        <div className="lg:w-1/2 w-full max-w-lg">
                            <div className="relative">
                                <div className="absolute -inset-1 bg-gradient-to-r from-primary to-orange-600 rounded-2xl blur opacity-30 animate-pulse"></div>
                                <div className="relative bg-card border rounded-2xl shadow-2xl p-6 lg:p-8">
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-4 p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-900/40">
                                            <div className="h-10 w-10 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center text-green-700 dark:text-green-300">
                                                <BarChart3 className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-green-950 dark:text-green-100">Zero Commission on Direct Sales</p>
                                                <p className="text-xs text-green-800 dark:text-green-300">Keep 100% of your listed card and sneaker prices</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4 p-3 bg-orange-50 dark:bg-orange-950/30 rounded-lg border border-orange-200 dark:border-orange-900/40">
                                            <div className="h-10 w-10 bg-orange-100 dark:bg-orange-900/50 rounded-full flex items-center justify-center text-orange-700 dark:text-orange-300">
                                                <Sparkles className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-orange-950 dark:text-orange-100">Rapid Camera Bulk Listing</p>
                                                <p className="text-xs text-orange-800 dark:text-orange-300">Scan and price slabs or raw cards in bulk</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-900/40">
                                            <div className="h-10 w-10 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center text-blue-700 dark:text-blue-300">
                                                <Globe className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-blue-950 dark:text-blue-100">Dedicated Storefront</p>
                                                <p className="text-xs text-blue-800 dark:text-blue-300">Your own store link with unified multi-buy deals</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Trust & Stats */}
            <section className="border-y bg-muted/30 py-8">
                <div className="container mx-auto max-w-6xl">
                    <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 text-center">
                        {[
                            { label: "Direct PayID & Cash", value: "Instant" },
                            { label: "Listing Fees", value: "$0" },
                            { label: "Community", value: "Australia-Wide" },
                            { label: "Partner Support", value: "Dedicated" },
                        ].map((stat, i) => (
                            <div key={i}>
                                <p className="text-3xl font-bold font-headline text-foreground">{stat.value}</p>
                                <p className="text-sm text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Main Features */}
            <section id="features" className="py-20 container mx-auto max-w-6xl px-6">
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <Badge variant="outline" className="mb-4">Why Partner with Benched?</Badge>
                    <h2 className="text-3xl md:text-4xl font-bold font-headline mb-4">Built for Serious Card & Sneaker Sellers</h2>
                    <p className="text-lg text-muted-foreground">
                        We know physical hobby shops and high-volume collectors need fast turnaround and zero marketplace fee drag.
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-6 md:gap-8">
                    <Card className="bg-card hover:shadow-lg transition-shadow border-t-4 border-t-primary">
                        <CardHeader>
                            <ShieldCheck className="w-10 h-10 text-primary mb-4" />
                            <CardTitle>Direct Australian Payments</CardTitle>
                            <CardDescription>Zero chargeback anxiety.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground">
                                Buyers pay you directly via PayID or cash upon local store pickup. No 14-day fund holds, and no surprise payment processor clawbacks.
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="bg-card hover:shadow-lg transition-shadow border-t-4 border-t-orange-500">
                        <CardHeader>
                            <Search className="w-10 h-10 text-orange-700 mb-4" />
                            <CardTitle>Comps & Price Intelligence</CardTitle>
                            <CardDescription>Instant Australian market data.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground">
                                Check completed Benched sales alongside one-click eBay AU Sold and 130point searches. Price showcase slabs accurately without leaving your workflow.
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="bg-card hover:shadow-lg transition-shadow border-t-4 border-t-blue-500">
                        <CardHeader>
                            <Zap className="w-10 h-10 text-blue-500 mb-4" />
                            <CardTitle>Rapid Bulk Listing</CardTitle>
                            <CardDescription>List 50 cards in minutes.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground">
                                Use our camera-based batch scanner to capture stacks of slabs or raw singles. Review names, numbers, and prices in a grid and publish in one tap.
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </section>

            {/* Platform Benefits */}
            <section className="py-20 bg-muted/20 border-y">
                <div className="container mx-auto max-w-6xl px-6">
                    <div className="flex flex-col md:flex-row gap-12 items-start">
                        <div className="md:w-1/3 sticky top-24">
                            <Badge variant="outline" className="mb-4 text-primary border-primary">Hobby First</Badge>
                            <h2 className="text-3xl md:text-4xl font-bold font-headline mb-6">Built for the Culture</h2>
                            <p className="text-lg text-muted-foreground mb-6">
                                Unlike generic second-hand platforms, Benched understands PSA slabs, rookie cards, sneaker colorways, and Australian domestic shipping.
                            </p>
                        </div>
                        
                        <div className="md:w-2/3 grid sm:grid-cols-2 gap-4">
                            {[
                                {
                                    title: "Verified Store Profile",
                                    desc: "Get a verified store badge, custom profile link, and showcase your physical location or Perth pickup.",
                                    icon: <Store className="w-5 h-5 text-primary" />
                                },
                                {
                                    title: "Multi-Card Deal Tiers",
                                    desc: "Bundle cheap singles into 4 for $15 Bronze tiers or custom volume discounts automatically.",
                                    icon: <BarChart3 className="w-5 h-5 text-primary" />
                                },
                                {
                                    title: "Direct PayID Routing",
                                    desc: "Orders display your PayID reference code so buyers transfer funds straight to your bank account.",
                                    icon: <ShieldCheck className="w-5 h-5 text-primary" />
                                },
                                {
                                    title: "Australia Post Friendly",
                                    desc: "Standard flat-rate shipping with combined postage rules across your entire stock.",
                                    icon: <Zap className="w-5 h-5 text-primary" />
                                },
                            ].map((item, i) => (
                                <div key={i} className="p-5 bg-card border rounded-xl hover:border-primary/30 transition-colors">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="p-2 bg-primary/10 rounded-lg">
                                            {item.icon}
                                        </div>
                                        <h4 className="font-bold">{item.title}</h4>
                                    </div>
                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                        {item.desc}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Pricing & Contact */}
            <section id="contact" className="py-24 container mx-auto max-w-6xl px-6">
                <div className="grid lg:grid-cols-2 gap-8 lg:gap-16">
                    <div className="space-y-8">
                        <div>
                            <h2 className="text-3xl font-bold font-headline mb-4">Partner Store Enquiries</h2>
                            <p className="text-lg text-muted-foreground">
                                Are you a local card shop, hobby retailer, or consignment dealer? Connect with our team to set up your verified store and bulk import inventory.
                            </p>
                        </div>

                        <div className="space-y-6">
                            <div className="flex gap-4">
                                <div className="h-12 w-12 bg-primary/10 rounded-lg flex-shrink-0 flex items-center justify-center text-primary">
                                    <Store className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg">Physical Storefront Promotion</h3>
                                    <p className="text-muted-foreground">Highlight your local brick-and-mortar store for customer pickups.</p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="h-12 w-12 bg-primary/10 rounded-lg flex-shrink-0 flex items-center justify-center text-primary">
                                    <Lock className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg">Dedicated Account Manager</h3>
                                    <p className="text-muted-foreground">Direct access to assist with catalog migration, bulk scans, and feature requests.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div>
                        <PartnerContactForm />
                    </div>
                </div>
            </section>

            {/* Footer Simple */}
            <footer className="py-8 text-center text-muted-foreground text-sm border-t">
                <p>&copy; {new Date().getFullYear()} Benched Australia. All rights reserved. | <Link href="/" className="hover:underline">Back to Marketplace</Link></p>
            </footer>
        </div>
    );
}
