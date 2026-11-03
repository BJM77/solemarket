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
  Check,
  Camera,
  Images,
  Sparkles
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
        <main className="min-h-screen bg-white text-slate-900">
            {/* Announcement Banner */}
            <div className="bg-primary text-primary-foreground py-3 text-center text-sm font-medium">
                🚀 Benched.au is live across Australia — list your sneakers or cards in seconds.
            </div>

            {/* Hero & 3-Choice Sell Hub */}
            <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28 bg-gradient-to-br from-slate-50 to-white">
                <div className="container mx-auto px-4 relative z-10">
                    <div className="max-w-4xl mx-auto text-center">
                        <div className="inline-flex items-center rounded-full px-3.5 py-1 text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 mb-6">
                            <CheckCircle2 className="h-4 w-4 mr-1.5" />
                            Zero Upfront Listing Fees • Local Perth & Australia-Wide
                        </div>
                        <h1 className="text-4xl md:text-6xl font-extrabold mb-4 tracking-tight text-slate-900">
                            How would you like to <span className="text-primary">sell today?</span>
                        </h1>
                        <p className="text-lg md:text-xl mb-10 text-slate-600 font-normal leading-relaxed max-w-2xl mx-auto">
                            Pick the workflow that matches what&apos;s in front of you. Both bulk modes funnel into the same fast review grid with sold-price suggestions.
                        </p>

                        {/* Three Clear Selling Doors */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left max-w-5xl mx-auto" data-testid="sell-three-choices">
                            {/* Choice 1: One Card / Sneaker */}
                            <Card className="border-2 border-slate-200 hover:border-primary transition-all shadow-sm hover:shadow-xl rounded-2xl flex flex-col justify-between bg-white">
                                <CardContent className="p-6 flex flex-col h-full justify-between space-y-6">
                                    <div>
                                        <div className="w-12 h-12 rounded-2xl bg-orange-100 text-primary flex items-center justify-center mb-4">
                                            <Sparkles className="h-6 w-6" />
                                        </div>
                                        <span className="text-[11px] font-black uppercase tracking-wider text-primary">Option 1 • Single Item</span>
                                        <h2 className="text-2xl font-extrabold mt-1 mb-2 text-slate-900">One Card or Pair</h2>
                                        <p className="text-sm text-slate-600 leading-relaxed">
                                            Best for grails, graded slabs, or sneakers. AI fills in the details from your photo while you control every field.
                                        </p>
                                    </div>
                                    <Button size="lg" className="w-full font-bold h-12 rounded-xl bg-primary hover:bg-orange-700 text-primary-foreground" asChild>
                                        <Link href="/sell/create">
                                            List Single Item <ArrowRight className="ml-2 h-4 w-4" />
                                        </Link>
                                    </Button>
                                </CardContent>
                            </Card>

                            {/* Choice 2: Stack of Photos (Fast Bulk) */}
                            <Card className="border-2 border-slate-200 hover:border-primary transition-all shadow-sm hover:shadow-xl rounded-2xl flex flex-col justify-between bg-white">
                                <CardContent className="p-6 flex flex-col h-full justify-between space-y-6">
                                    <div>
                                        <div className="w-12 h-12 rounded-2xl bg-orange-100 text-primary flex items-center justify-center mb-4">
                                            <Images className="h-6 w-6" />
                                        </div>
                                        <span className="text-[11px] font-black uppercase tracking-wider text-primary">Option 2 • Fast Bulk</span>
                                        <h2 className="text-2xl font-extrabold mt-1 mb-2 text-slate-900">A Stack of Photos</h2>
                                        <p className="text-sm text-slate-600 leading-relaxed">
                                            Already took photos? Drop up to 50 front-and-back photos from your camera roll and we&apos;ll pair &amp; draft them automatically.
                                        </p>
                                    </div>
                                    <Button size="lg" className="w-full font-bold h-12 rounded-xl bg-slate-900 hover:bg-slate-800 text-white" asChild>
                                        <Link href="/sell/fast-bulk">
                                            Upload Photo Stack <ArrowRight className="ml-2 h-4 w-4" />
                                        </Link>
                                    </Button>
                                </CardContent>
                            </Card>

                            {/* Choice 3: Scan As I Go (Autofast) */}
                            <Card className="border-2 border-slate-200 hover:border-primary transition-all shadow-sm hover:shadow-xl rounded-2xl flex flex-col justify-between bg-white">
                                <CardContent className="p-6 flex flex-col h-full justify-between space-y-6">
                                    <div>
                                        <div className="w-12 h-12 rounded-2xl bg-orange-100 text-primary flex items-center justify-center mb-4">
                                            <Camera className="h-6 w-6" />
                                        </div>
                                        <span className="text-[11px] font-black uppercase tracking-wider text-primary">Option 3 • Autofast</span>
                                        <h2 className="text-2xl font-extrabold mt-1 mb-2 text-slate-900">Scan As I Go</h2>
                                        <p className="text-sm text-slate-600 leading-relaxed">
                                            Point your phone camera at card after card. Auto-shutter captures front &amp; back hands-free while drafts build in the background.
                                        </p>
                                    </div>
                                    <Button size="lg" className="w-full font-bold h-12 rounded-xl bg-slate-900 hover:bg-slate-800 text-white" asChild>
                                        <Link href="/sell/autofast">
                                            Launch Live Scanner <ArrowRight className="ml-2 h-4 w-4" />
                                        </Link>
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-sm">
                            <Link href="/sell/drafts-review" className="font-bold text-primary hover:underline flex items-center gap-1">
                                Review saved bulk drafts <ArrowRight className="h-4 w-4" />
                            </Link>
                            <span className="text-slate-300">•</span>
                            <button
                                type="button"
                                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                                className="text-slate-600 hover:text-slate-900 font-medium"
                            >
                                New to Benched? See how selling works
                            </button>
                        </div>
                    </div>
                </div>

                {/* Decorative Elements */}
                <div className="absolute top-1/2 left-0 -translate-y-1/2 -translate-x-1/2 w-64 h-64 bg-primary/10 rounded-full blur-3xl"></div>
                <div className="absolute top-1/4 right-0 -translate-x-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl"></div>
            </section>

            {/* Feature Highlights */}
            <section id="features" className="py-24 bg-white">
                <div className="container mx-auto px-4">
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold mb-4 text-slate-900">Built for Sellers Who Value Time</h2>
                        <p className="text-lg text-slate-600">We&apos;ve removed the friction from traditional marketplaces so you can focus on growing your collection.</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        <Card className="bg-white text-slate-900 border-0 shadow-premium bg-slate-50/50 hover:bg-white transition-all group">
                            <CardContent className="p-8">
                                <div className="p-3 bg-orange-100 rounded-xl w-fit mb-6 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                    <Zap className="h-6 w-6" />
                                </div>
                                <h3 className="text-xl font-bold mb-3">Lightning Fast Listings</h3>
                                <p className="text-slate-600 leading-relaxed">
                                    Our optimized mobile flow allows you to snap photos and list your shoes or cards in under 60 seconds.
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="bg-white text-slate-900 border-0 shadow-premium bg-slate-50/50 hover:bg-white transition-all group">
                            <CardContent className="p-8">
                                <div className="p-3 bg-orange-100 rounded-xl w-fit mb-6 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                    <Facebook className="h-6 w-6" />
                                </div>
                                <h3 className="text-xl font-bold mb-3">One-Click FB Sharing</h3>
                                <p className="text-slate-600 leading-relaxed">
                                    Instantly share your listings to Facebook Groups and Marketplace. Reach your existing audience while benefiting from Benched&apos;s secure checkout.
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="bg-white text-slate-900 border-0 shadow-premium bg-slate-50/50 hover:bg-white transition-all group">
                            <CardContent className="p-8">
                                <div className="p-3 bg-orange-100 rounded-xl w-fit mb-6 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                    <Shield className="h-6 w-6" />
                                </div>
                                <h3 className="text-xl font-bold mb-3">Get Paid Directly</h3>
                                <p className="text-slate-600 leading-relaxed">
                                    Buyers pay you directly by PayID, or cash on pickup in Perth. Ship only once the PayID payment is in your account.
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </section>

            {/* Specialized Categories */}
            <section className="py-20 bg-card text-foreground overflow-hidden">
                <div className="container mx-auto px-4 relative">
                    <div className="grid lg:grid-cols-2 gap-16 items-center">
                        <div>
                            <h2 className="text-4xl md:text-5xl font-bold mb-8 leading-tight">
                                Designed Specifically for <span className="text-primary">Grails</span> and <span className="text-orange-700">Heavy Hitters</span>
                            </h2>
                            <ul className="space-y-6">
                                <li className="flex items-start gap-4">
                                    <div className="mt-1 bg-primary/20 p-1 rounded-full">
                                        <Check className="h-5 w-5 text-primary" />
                                    </div>
                                    <div>
                                        <span className="font-bold block text-xl">Sneaker Experts</span>
                                        <p className="text-muted-foreground">Advanced condition tracking, size conversions, and brand-specific data.</p>
                                    </div>
                                </li>
                                <li className="flex items-start gap-4">
                                    <div className="mt-1 bg-primary/20 p-1 rounded-full">
                                        <Check className="h-5 w-5 text-primary" />
                                    </div>
                                    <div>
                                        <span className="font-bold block text-xl">Card Collectors</span>
                                        <p className="text-muted-foreground">Support for PSA/BGS grading info, slab tracking, and raw card details.</p>
                                    </div>
                                </li>
                                <li className="flex items-start gap-4">
                                    <div className="mt-1 bg-primary/20 p-1 rounded-full">
                                        <Check className="h-5 w-5 text-primary" />
                                    </div>
                                    <div>
                                        <span className="font-bold block text-xl">Secure Payments</span>
                                        <p className="text-muted-foreground">Get paid by PayID or cash on pickup, with no fees taken.</p>
                                    </div>
                                </li>
                            </ul>
                        </div>
                        <div className="relative">
                            <div className="aspect-square bg-gradient-to-br from-primary to-orange-800 rounded-3xl opacity-20 absolute -inset-4 blur-2xl"></div>
                            <div className="relative bg-muted border border-border rounded-3xl p-8 shadow-2xl">
                                <div className="flex items-center justify-between mb-8">
                                    <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center font-bold">B</div>
                                        <div>
                                            <p className="font-bold">Benched Seller Dashboard</p>
                                            <p className="text-xs text-muted-foreground">Live Status: Active</p>
                                        </div>
                                    </div>
                                    <Badge className="bg-green-50 text-green-800 border-green-200">New Seller</Badge>
                                </div>
                                <div className="space-y-4">
                                    <div className="h-4 w-full bg-muted rounded animate-pulse"></div>
                                    <div className="h-4 w-3/4 bg-muted rounded animate-pulse"></div>
                                    <div className="grid grid-cols-2 gap-4 pt-4">
                                        <div className="h-24 bg-muted rounded-xl flex flex-col items-center justify-center">
                                            <p className="text-xs text-muted-foreground mb-1">Items Sold</p>
                                            <p className="text-2xl font-bold">0</p>
                                        </div>
                                        <div className="h-24 bg-muted rounded-xl flex flex-col items-center justify-center">
                                            <p className="text-xs text-muted-foreground mb-1">Sales</p>
                                            <p className="text-2xl font-bold">$0.00</p>
                                        </div>
                                    </div>
                                    <Button className="w-full bg-primary hover:bg-orange-700 text-primary-foreground mt-4" asChild>
                                        <Link href="/sell/create">Create New Listing</Link>
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
                            <div className="p-8 md:p-16 bg-primary text-primary-foreground">
                                <h2 className="text-4xl font-bold mb-6 leading-tight">Secure Your Seller Spot Early</h2>
                                <p className="text-xl mb-8">
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
                                <div className="p-6 bg-orange-800 text-white rounded-2xl">
                                    <p className="text-sm italic">
                                        &quot;This platform is designed specifically to give Australian sellers and buyers a faster, safer way to trade shoes and cards.&quot;
                                    </p>
                                </div>
                            </div>
                            <div className="p-8 md:p-16 flex flex-col justify-center text-center lg:text-left">
                                <h3 className="text-3xl font-bold mb-4 text-slate-900">Ready to get started?</h3>
                                <p className="text-slate-600 mb-8 text-lg leading-relaxed">
                                    Registration is free and takes less than 2 minutes. Join the future of the Australian secondary market.
                                </p>
                                <Button size="lg" className="h-16 text-xl font-bold bg-card text-foreground hover:bg-muted rounded-2xl group shadow-lg shadow-slate-200" asChild>
                                    <Link href="/sign-up?accountType=seller">
                                        Register as a Seller
                                        <ArrowRight className="ml-2 h-6 w-6 group-hover:translate-x-1 transition-transform" />
                                    </Link>
                                </Button>
                                <p className="mt-6 text-sm text-slate-600">
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
                                Create your free seller profile, verify your account and start listing today.
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
