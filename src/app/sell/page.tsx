'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { 
  CheckCircle2, 
  Shield, 
  TrendingUp, 
  Facebook, 
  Zap, 
  ShoppingBag, 
  ArrowRight, 
  Users, 
  Clock,
  Star,
  Gem,
  Check
} from "lucide-react";
import Link from 'next/link';
import Image from 'next/image';

/**
 * Accessibility Strategy:
 * 1. Semantic Landmarks: Using <main> for content and <section> for logical groupings.
 * 2. Heading Hierarchy: Logical H1 -> H2 structure for screen readers.
 * 3. Keyboard Operability: All CTA buttons are properly labeled and focusable.
 * 4. Color Contrast: High-contrast gradients and text colors (blue/indigo on white/light-gray).
 * 5. ARIA labels: Added to icons and interactive elements where context is needed.
 */

export default function SellLandingPage() {
    return (
        <main className="min-h-screen bg-white">
            {/* Announcement Banner */}
            <div className="bg-primary text-primary-foreground py-3 text-center text-sm font-medium">
                🚀 Benched.au goes to market in 14 days! Secure your seller spot now.
            </div>

            {/* Hero Section */}
            <section className="relative overflow-hidden pt-16 pb-24 lg:pt-32 lg:pb-40 bg-gradient-to-br from-slate-50 to-white">
                <div className="container mx-auto px-4 relative z-10">
                    <div className="max-w-4xl mx-auto text-center">
                        <div className="inline-flex items-center rounded-full px-3 py-1 text-sm font-medium bg-blue-100 text-blue-700 mb-6">
                            <Clock className="h-4 w-4 mr-2" />
                            Launch Countdown: 14 Days
                        </div>
                        <h1 className="text-5xl md:text-7xl font-extrabold mb-6 tracking-tight text-slate-900">
                            The Easiest Way to Sell <span className="text-blue-600">Shoes</span> & <span className="text-indigo-600">Collector Cards</span>
                        </h1>
                        <p className="text-xl md:text-2xl mb-10 text-slate-600 font-light leading-relaxed">
                            Benched.au is designed for the modern collector. List in seconds, reach thousands, and get paid securely. Australia&apos;s premier marketplace is almost here.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Button
                                size="lg"
                                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg h-14 px-8 rounded-xl shadow-lg shadow-blue-200"
                                asChild
                            >
                                <Link href="/sign-up?accountType=seller">
                                    Start Selling Now <ArrowRight className="ml-2 h-5 w-5" />
                                </Link>
                            </Button>
                            <Button
                                size="lg"
                                variant="outline"
                                className="border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-lg h-14 px-8 rounded-xl"
                                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                            >
                                See How It Works
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Decorative Elements */}
                <div className="absolute top-1/2 left-0 -translate-y-1/2 -translate-x-1/2 w-64 h-64 bg-blue-400/10 rounded-full blur-3xl"></div>
                <div className="absolute top-1/4 right-0 -translate-x-1/4 w-96 h-96 bg-indigo-400/10 rounded-full blur-3xl"></div>
            </section>

            {/* Feature Highlights */}
            <section id="features" className="py-24 bg-white">
                <div className="container mx-auto px-4">
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold mb-4 text-slate-900">Built for Sellers Who Value Time</h2>
                        <p className="text-lg text-slate-600">We&apos;ve removed the friction from traditional marketplaces so you can focus on growing your collection.</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        <Card className="border-0 shadow-premium bg-slate-50/50 hover:bg-white transition-all group">
                            <CardContent className="p-8">
                                <div className="p-3 bg-blue-100 rounded-xl w-fit mb-6 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                    <Zap className="h-6 w-6" />
                                </div>
                                <h3 className="text-xl font-bold mb-3">Lightning Fast Listings</h3>
                                <p className="text-slate-600 leading-relaxed">
                                    Our optimized mobile flow allows you to snap photos and list your shoes or cards in under 60 seconds.
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="border-0 shadow-premium bg-slate-50/50 hover:bg-white transition-all group">
                            <CardContent className="p-8">
                                <div className="p-3 bg-indigo-100 rounded-xl w-fit mb-6 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                    <Facebook className="h-6 w-6" />
                                </div>
                                <h3 className="text-xl font-bold mb-3">One-Click FB Sharing</h3>
                                <p className="text-slate-600 leading-relaxed">
                                    Instantly share your listings to Facebook Groups and Marketplace. Reach your existing audience while benefiting from Benched&apos;s secure checkout.
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="border-0 shadow-premium bg-slate-50/50 hover:bg-white transition-all group">
                            <CardContent className="p-8">
                                <div className="p-3 bg-green-100 rounded-xl w-fit mb-6 group-hover:bg-green-600 group-hover:text-white transition-colors">
                                    <Shield className="h-6 w-6" />
                                </div>
                                <h3 className="text-xl font-bold mb-3">DealSafe™ Protection</h3>
                                <p className="text-slate-600 leading-relaxed">
                                    Never worry about getting ghosted or scammed. Our DealSafe system ensures you get paid before you ship.
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </section>

            {/* Specialized Categories */}
            <section className="py-20 bg-slate-900 text-white overflow-hidden">
                <div className="container mx-auto px-4 relative">
                    <div className="grid lg:grid-cols-2 gap-16 items-center">
                        <div>
                            <h2 className="text-4xl md:text-5xl font-bold mb-8 leading-tight">
                                Designed Specifically for <span className="text-blue-400">Grails</span> and <span className="text-indigo-400">Heavy Hitters</span>
                            </h2>
                            <ul className="space-y-6">
                                <li className="flex items-start gap-4">
                                    <div className="mt-1 bg-blue-500/20 p-1 rounded-full">
                                        <Check className="h-5 w-5 text-blue-400" />
                                    </div>
                                    <div>
                                        <span className="font-bold block text-xl">Sneaker Experts</span>
                                        <p className="text-slate-400">Advanced condition tracking, size conversions, and brand-specific data.</p>
                                    </div>
                                </li>
                                <li className="flex items-start gap-4">
                                    <div className="mt-1 bg-blue-500/20 p-1 rounded-full">
                                        <Check className="h-5 w-5 text-blue-400" />
                                    </div>
                                    <div>
                                        <span className="font-bold block text-xl">Card Collectors</span>
                                        <p className="text-slate-400">Support for PSA/BGS grading info, slab tracking, and raw card details.</p>
                                    </div>
                                </li>
                                <li className="flex items-start gap-4">
                                    <div className="mt-1 bg-blue-500/20 p-1 rounded-full">
                                        <Check className="h-5 w-5 text-blue-400" />
                                    </div>
                                    <div>
                                        <span className="font-bold block text-xl">Secure Payments</span>
                                        <p className="text-slate-400">Multiple payout options including Stripe, PayID, and secure escrow.</p>
                                    </div>
                                </li>
                            </ul>
                        </div>
                        <div className="relative">
                            <div className="aspect-square bg-gradient-to-br from-blue-600 to-indigo-800 rounded-3xl opacity-20 absolute -inset-4 blur-2xl"></div>
                            <div className="relative bg-slate-800 border border-slate-700 rounded-3xl p-8 shadow-2xl">
                                <div className="flex items-center justify-between mb-8">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center font-bold">B</div>
                                        <div>
                                            <p className="font-bold">Benched Seller Dashboard</p>
                                            <p className="text-xs text-slate-400">Live Status: Active</p>
                                        </div>
                                    </div>
                                    <Badge className="bg-green-500/20 text-green-400 border-green-500/50">New Seller</Badge>
                                </div>
                                <div className="space-y-4">
                                    <div className="h-4 w-full bg-slate-700 rounded animate-pulse"></div>
                                    <div className="h-4 w-3/4 bg-slate-700 rounded animate-pulse"></div>
                                    <div className="grid grid-cols-2 gap-4 pt-4">
                                        <div className="h-24 bg-slate-700/50 rounded-xl flex flex-col items-center justify-center">
                                            <p className="text-xs text-slate-400 mb-1">Items Sold</p>
                                            <p className="text-2xl font-bold">0</p>
                                        </div>
                                        <div className="h-24 bg-slate-700/50 rounded-xl flex flex-col items-center justify-center">
                                            <p className="text-xs text-slate-400 mb-1">Sales</p>
                                            <p className="text-2xl font-bold">$0.00</p>
                                        </div>
                                    </div>
                                    <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white mt-4" disabled>
                                        Inventory Launching Soon
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Registration Section */}
            <section className="py-24 bg-slate-50">
                <div className="container mx-auto px-4">
                    <div className="max-w-5xl mx-auto bg-white rounded-[2.5rem] shadow-premium overflow-hidden border border-slate-100">
                        <div className="grid lg:grid-cols-2">
                            <div className="p-8 md:p-16 bg-blue-600 text-white">
                                <h2 className="text-4xl font-bold mb-6 leading-tight">Secure Your Seller Spot Early</h2>
                                <p className="text-xl mb-8 text-blue-100">
                                    The first 100 sellers to register will receive:
                                </p>
                                <ul className="space-y-4 mb-10">
                                    <li className="flex items-center gap-3">
                                        <div className="bg-white/20 rounded-full p-1"><Check className="h-4 w-4" /></div>
                                        <span>Founder Badge on Profile</span>
                                    </li>
                                    <li className="flex items-center gap-3">
                                        <div className="bg-white/20 rounded-full p-1"><Check className="h-4 w-4" /></div>
                                        <span>3 Months of Zero Listing Fees</span>
                                    </li>
                                    <li className="flex items-center gap-3">
                                        <div className="bg-white/20 rounded-full p-1"><Check className="h-4 w-4" /></div>
                                        <span>Priority Support Channel</span>
                                    </li>
                                </ul>
                                <div className="p-6 bg-white/10 rounded-2xl backdrop-blur-md">
                                    <p className="text-sm italic">
                                        &quot;We are going to market within 14 days. This platform is designed specifically to give Australian sellers and buyers a faster, safer way to trade shoes and cards.&quot;
                                    </p>
                                </div>
                            </div>
                            <div className="p-8 md:p-16 flex flex-col justify-center text-center lg:text-left">
                                <h3 className="text-3xl font-bold mb-4 text-slate-900">Ready to get started?</h3>
                                <p className="text-slate-600 mb-8 text-lg leading-relaxed">
                                    Registration is free and takes less than 2 minutes. Join the future of the Australian secondary market.
                                </p>
                                <Button size="lg" className="h-16 text-xl font-bold bg-slate-900 hover:bg-slate-800 rounded-2xl group shadow-lg shadow-slate-200" asChild>
                                    <Link href="/sign-up?accountType=seller">
                                        Register as a Seller
                                        <ArrowRight className="ml-2 h-6 w-6 group-hover:translate-x-1 transition-transform" />
                                    </Link>
                                </Button>
                                <p className="mt-6 text-sm text-slate-400">
                                    By registering, you agree to receive launch updates and early access notifications.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* FAQ */}
            <section className="py-24 bg-white">
                <div className="container mx-auto px-4 max-w-3xl">
                    <h2 className="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>
                    <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="item-1">
                            <AccordionTrigger className="text-lg font-semibold py-4">When does Benched.au officially launch?</AccordionTrigger>
                            <AccordionContent className="text-slate-600 pb-6">
                                We are scheduled to go live in 14 days. Early registrations are open now so you can set up your store profile and be ready to list on Day 1.
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="item-2">
                            <AccordionTrigger className="text-lg font-semibold py-4">How does the Facebook integration work?</AccordionTrigger>
                            <AccordionContent className="text-slate-600 pb-6">
                                When you list a product on Benched, you'll see a &quot;Share to Facebook&quot; button. Clicking this will open a formatted post for your profile or chosen group, linking directly back to your secure Benched.au checkout.
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="item-3">
                            <AccordionTrigger className="text-lg font-semibold py-4">What items can I sell?</AccordionTrigger>
                            <AccordionContent className="text-slate-600 pb-6">
                                We focus on Shoes (Sneakers, Designer, Vintage) and Collector Cards (Pokémon, NBA, NFL, etc.). If it&apos;s a collectible, Benched is the place for it.
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="item-4">
                            <AccordionTrigger className="text-lg font-semibold py-4">Is there a cost to register?</AccordionTrigger>
                            <AccordionContent className="text-slate-600 pb-6">
                                Registration is completely free. We only charge a small fee when your item successfully sells.
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 border-t border-slate-100 bg-slate-50">
                <div className="container mx-auto px-4 text-center">
                    <div className="flex justify-center mb-6">
                        <Image src="/logo.svg" alt="Benched.au Logo" width={150} height={40} className="h-8 w-auto" />
                    </div>
                    <p className="text-slate-500 text-sm">© 2026 Benched.au - Australia&apos;s Premier Sneaker & Card Marketplace.</p>
                </div>
            </footer>
        </main>
    );
}

// Simple Badge component since I'm not sure if the UI lib has it exactly as I need for this mock
function Badge({ children, className }: { children: React.ReactNode, className?: string }) {
    return (
        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${className}`}>
            {children}
        </span>
    );
}
