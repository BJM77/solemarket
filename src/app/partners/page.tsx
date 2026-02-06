import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Search, Zap, BarChart3, Store, Lock, Globe, Sparkles } from "lucide-react";
import { PartnerContactForm } from "@/components/partners/PartnerContactForm";
import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Partner with Picksy | Digitise Your Store",
    description: "Exclusive partnership program for Op Shops, Antique Stores, and Collectors. Unlock AI-powered listing, security, and world-class SEO.",
    robots: {
        index: false, // Hidden page
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
                                Restricted Access • Partner Program
                            </Badge>
                            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight font-headline text-foreground">
                                Turn Your Shelf Space <br />
                                <span className="text-primary">Into Global Sales.</span>
                            </h1>
                            <p className="text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0">
                                The exclusive digital storefront for Op Shops, Antique Dealers, and Collector Stores.
                                Leverage AI, security, and SEO to unlock the true value of your inventory.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                                <Button size="lg" className="text-base px-8 shadow-lg shadow-primary/20" asChild>
                                    <Link href="#contact">Apply for Access</Link>
                                </Button>
                                <Button size="lg" variant="outline" className="text-base" asChild>
                                    <Link href="#features">Explore Benefits</Link>
                                </Button>
                            </div>
                        </div>
                        <div className="lg:w-1/2 w-full max-w-lg">
                            <div className="relative">
                                <div className="absolute -inset-1 bg-gradient-to-r from-primary to-purple-600 rounded-2xl blur opacity-30 animate-pulse"></div>
                                <div className="relative bg-card border rounded-2xl shadow-2xl p-6 lg:p-8">
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-4 p-3 bg-green-50 rounded-lg border border-green-100">
                                            <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                                                <BarChart3 className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-green-900">Revenue increased by 40%</p>
                                                <p className="text-xs text-green-700">Average partner growth in month 1</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                                            <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                                                <Sparkles className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-blue-900">AI Listing Enabled</p>
                                                <p className="text-xs text-blue-700">List items in seconds, not minutes</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4 p-3 bg-purple-50 rounded-lg border border-purple-100">
                                            <div className="h-10 w-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-600">
                                                <Globe className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-purple-900">Global Reach</p>
                                                <p className="text-xs text-purple-700">Your items seen by collectors worldwide</p>
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
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                        {[
                            { label: "Verified Buyers", value: "100%" },
                            { label: "Search Visibility", value: "Top Tier" },
                            { label: "Payment Security", value: "Bank-Grade" },
                            { label: "Partner Support", value: "24/7" },
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
                    <Badge variant="outline" className="mb-4">Why Picksy?</Badge>
                    <h2 className="text-3xl md:text-4xl font-bold font-headline mb-4">Built for Serious Sellers</h2>
                    <p className="text-lg text-muted-foreground">
                        We understand the unique challenges of physical stores. Our platform is designed to seamlessly integrate with your workflow.
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                    <Card className="bg-card hover:shadow-lg transition-shadow border-t-4 border-t-primary">
                        <CardHeader>
                            <ShieldCheck className="w-10 h-10 text-primary mb-4" />
                            <CardTitle>Unmatched Security</CardTitle>
                            <CardDescription>Zero fraud tolerance.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground">
                                Every buyer is verified with Government ID. We gate high-value transactions to ensure you only deal with serious, legitimate collectors. Secure payments via Stripe mean you get paid fast.
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="bg-card hover:shadow-lg transition-shadow border-t-4 border-t-blue-500">
                        <CardHeader>
                            <Search className="w-10 h-10 text-blue-500 mb-4" />
                            <CardTitle>SEO Domination</CardTitle>
                            <CardDescription>Get found by the world.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground">
                                Don&apos;t rely on foot traffic alone. Our world-class SEO architecture ensures your unique, vintage items rank high on Google, bringing global collectors to your virtual doorstep.
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="bg-card hover:shadow-lg transition-shadow border-t-4 border-t-purple-500">
                        <CardHeader>
                            <Zap className="w-10 h-10 text-purple-500 mb-4" />
                            <CardTitle>AI-Powered Speed</CardTitle>
                            <CardDescription>List in seconds.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground">
                                Snap a photo, and our AI identifies the item, writes the description, and suggests pricing. Turning unpriced inventory into active listings has never been faster.
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </section>

            {/* Premier Feature: Research Service */}
            <section className="py-20 bg-slate-900 text-white relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('/noise.png')] opacity-5 mix-blend-overlay"></div>
                <div className="container mx-auto max-w-6xl px-6 relative z-10">
                    <div className="flex flex-col md:flex-row items-center gap-12">
                        <div className="md:w-1/2">
                            <Badge className="bg-yellow-500 text-black hover:bg-yellow-400 mb-6">New Premium Service</Badge>
                            <h2 className="text-3xl md:text-4xl font-bold font-headline mb-6">Picksy Research & Valuation</h2>
                            <p className="text-slate-300 text-lg mb-8 leading-relaxed">
                                Have high-value items but unsure of their market price? Don&apos;t leave money on the table.
                                <br /><br />
                                Our expert team, aided by advanced market data tools, will <strong>research, grade, and value your items</strong> for you. We provide a detailed report and listing strategy to ensure you achieve the maximum market rate.
                            </p>
                            <ul className="space-y-4 mb-8">
                                <li className="flex items-center gap-3">
                                    <div className="h-6 w-6 rounded-full bg-green-500/20 flex items-center justify-center text-green-400">
                                        <CheckIcon />
                                    </div>
                                    <span>Expert appraisal of rare collectibles</span>
                                </li>
                                <li className="flex items-center gap-3">
                                    <div className="h-6 w-6 rounded-full bg-green-500/20 flex items-center justify-center text-green-400">
                                        <CheckIcon />
                                    </div>
                                    <span>Data-driven pricing strategy</span>
                                </li>
                                <li className="flex items-center gap-3">
                                    <div className="h-6 w-6 rounded-full bg-green-500/20 flex items-center justify-center text-green-400">
                                        <CheckIcon />
                                    </div>
                                    <span>Maximize margins on donations/estates</span>
                                </li>
                            </ul>
                        </div>
                        <div className="md:w-1/2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
                            <div className="text-center space-y-4">
                                <h3 className="text-2xl font-bold">Maximise Your Inventory</h3>
                                <p className="text-slate-400 text-sm">Case Study: Vintage Comic Collection</p>
                                <div className="grid grid-cols-2 gap-4 my-8">
                                    <div className="p-4 bg-red-500/10 rounded-lg border border-red-500/20">
                                        <p className="text-xs text-red-400 uppercase font-bold">Store Price</p>
                                        <p className="text-2xl font-bold text-white">$450</p>
                                    </div>
                                    <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                                        <p className="text-xs text-green-400 uppercase font-bold">Picksy Valued</p>
                                        <p className="text-2xl font-bold text-white">$1,200</p>
                                    </div>
                                </div>
                                <p className="text-lg font-medium text-green-400">+166% Profit</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Pricing & Contact */}
            <section id="contact" className="py-24 container mx-auto max-w-6xl px-6">
                <div className="grid lg:grid-cols-2 gap-16">
                    <div className="space-y-8">
                        <div>
                            <h2 className="text-3xl font-bold font-headline mb-4">Flexible, Negotiable Pricing</h2>
                            <p className="text-lg text-muted-foreground">
                                We know that every store is different. Whether you are a non-profit Op Shop or a high-end Antique Dealer, we have a structure that works for you.
                            </p>
                        </div>

                        <div className="space-y-6">
                            <div className="flex gap-4">
                                <div className="h-12 w-12 bg-primary/10 rounded-lg flex-shrink-0 flex items-center justify-center text-primary">
                                    <Store className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg">Volume-Based Discounts</h3>
                                    <p className="text-muted-foreground">Lower fees as you list more items. Perfect for high-volume intake stores.</p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="h-12 w-12 bg-primary/10 rounded-lg flex-shrink-0 flex items-center justify-center text-primary">
                                    <Lock className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg">Fixed-Rate Partnerships</h3>
                                    <p className="text-muted-foreground">Prefer predictability? Let&apos;s agree on a flat monthly rate for unlimited listings.</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 bg-amber-50 rounded-xl border border-amber-200">
                            <h4 className="font-bold text-amber-800 mb-2">Op Shop Special</h4>
                            <p className="text-amber-700 text-sm">
                                Registered charities and Op Shops qualify for our subsidised community rate. Contact us to learn more.
                            </p>
                        </div>
                    </div>

                    <div>
                        <PartnerContactForm />
                    </div>
                </div>
            </section>

            {/* Footer Simple */}
            <footer className="py-8 text-center text-muted-foreground text-sm border-t">
                <p>&copy; {new Date().getFullYear()} Picksy. All rights reserved. | <Link href="/" className="hover:underline">Back to Marketplace</Link></p>
            </footer>
        </div>
    );
}

function CheckIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
    )
}
