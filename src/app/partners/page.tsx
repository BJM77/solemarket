import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Store, Package, Users, Video, CalendarDays, ArrowRight, Check } from "lucide-react";
import { PartnerContactForm } from "@/components/partners/PartnerContactForm";
import Link from "next/link";
import { Metadata } from "next";
import type { LucideIcon } from "lucide-react";

export const metadata: Metadata = {
    title: "Partner with Benched | Basketball Cards & Sneakers Australia",
    description: "Five ways to partner with Benched, Australia's basketball card and sneaker marketplace: shops, breakers, clubs, creators and card shows.",
    robots: {
        index: false, // Keep hidden / unindexed until publicly announced
        follow: false,
    },
};

interface Opportunity {
    id: string;
    title: string;
    summary: string;
    points: { text: string; href?: string }[];
    cta: string;
    Icon: LucideIcon;
}

/** The five ways to partner. Keep every point true to what the site does today. */
const OPPORTUNITIES: Opportunity[] = [
    {
        id: "shops",
        title: "Card shops & sneaker stores",
        summary: "List your basketball card and sneaker stock on Benched and sell to Australian buyers alongside your shopfront.",
        points: [
            { text: "Bulk listing tools: photo scan for cards, CSV upload and Facebook Marketplace import", href: "/sell" },
            { text: "Your own store page with all your listings and your pickup location" },
            { text: "Bronze, Silver and Gold bundle tiers to move cheaper singles", href: "/multibuy" },
        ],
        cta: "Talk to us about listing your stock",
        Icon: Store,
    },
    {
        id: "breakers",
        title: "Breakers & card-drop hosts",
        summary: "Sell the singles and hits from your breaks, and work with us on featuring upcoming breaks and drops.",
        points: [
            { text: "Fast photo listing for raw and graded cards" },
            { text: "Multi-buy tiers suit lots of low-value base and inserts" },
            { text: "See what collectors are hunting on Wanted to Buy", href: "/wtb" },
        ],
        cta: "Tell us about your breaks",
        Icon: Package,
    },
    {
        id: "clubs",
        title: "Basketball clubs, leagues & associations",
        summary: "Get a free club page where your members and families buy and sell shoes, cards and gear.",
        points: [
            { text: "A club page showing only your members' listings, with your name and logo", href: "/clubs" },
            { text: "No setup cost and no monthly fee" },
            { text: "Buyers pay members directly by PayID or cash on pickup" },
        ],
        cta: "Ask about a club page",
        Icon: Users,
    },
    {
        id: "creators",
        title: "Content creators & collectors",
        summary: "Make content about basketball cards or sneakers? Partner with us on features, collabs and giveaways.",
        points: [
            { text: "Share your store page link with your audience" },
            { text: "Show off your collection on your Benched profile" },
            { text: "We're open to collabs; there's no paid referral scheme yet" },
        ],
        cta: "Pitch us an idea",
        Icon: Video,
    },
    {
        id: "events",
        title: "Card shows & events",
        summary: "Running a card show, sneaker swap or meetup in Australia? Let's work together before and after the day.",
        points: [
            { text: "Vendors can list stock on Benched before and after the event" },
            { text: "Buyers can arrange pickup at the event and pay by cash or PayID" },
            { text: "Tell us your dates and we'll look at ways to help promote it" },
        ],
        cta: "Tell us about your event",
        Icon: CalendarDays,
    },
];

const FACTS = [
    { value: "$0", label: "To list" },
    { value: "PayID or cash", label: "Paid direct to you" },
    { value: "Cards & sneakers", label: "Basketball focus" },
    { value: "Australia", label: "Local buyers" },
];

export default function PartnersPage() {
    return (
        <div className="min-h-screen bg-background">
            {/* Hero Section */}
            <section className="relative py-16 md:py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-primary/5 to-background overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full bg-[url('/grid-pattern.svg')] opacity-10 pointer-events-none" />
                <div className="container mx-auto max-w-6xl relative z-10">
                    <div className="max-w-3xl mx-auto text-center space-y-6">
                        <Badge variant="secondary" className="px-3 py-1 text-sm font-medium border-primary/20 bg-primary/10 text-primary">
                            Partners • Basketball Cards & Sneakers in Australia
                        </Badge>
                        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight font-headline text-foreground">
                            Partner with <span className="text-primary">Benched.</span>
                        </h1>
                        <p className="text-base sm:text-lg text-muted-foreground">
                            Benched is a marketplace for basketball cards and sneakers in Australia. Buyers pay sellers
                            directly by PayID or cash on pickup. There are five ways to work with us.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
                            <Button size="lg" className="text-base px-8 shadow-lg shadow-primary/20 h-12" asChild>
                                <Link href="#contact">Make an enquiry</Link>
                            </Button>
                            <Button size="lg" variant="outline" className="text-base h-12" asChild>
                                <Link href="#opportunities">See the 5 opportunities</Link>
                            </Button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Facts */}
            <section className="border-y bg-muted/30 py-8 px-4">
                <div className="container mx-auto max-w-6xl">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 text-center">
                        {FACTS.map((f) => (
                            <div key={f.label}>
                                <p className="text-xl sm:text-2xl md:text-3xl font-bold font-headline text-foreground">{f.value}</p>
                                <p className="text-xs sm:text-sm text-muted-foreground uppercase tracking-wider">{f.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* The five opportunities */}
            <section id="opportunities" className="py-16 md:py-20 container mx-auto max-w-6xl px-4 sm:px-6">
                <div className="text-center max-w-3xl mx-auto mb-10 md:mb-16">
                    <Badge variant="outline" className="mb-4">Ways to partner</Badge>
                    <h2 className="text-3xl md:text-4xl font-bold font-headline mb-4">5 partnership opportunities</h2>
                    <p className="text-base sm:text-lg text-muted-foreground">
                        Pick the one that fits and send us an enquiry. Listing on Benched is free.
                    </p>
                </div>

                <ol className="grid gap-6 md:grid-cols-2 lg:grid-cols-3" data-testid="partner-opportunities">
                    {OPPORTUNITIES.map(({ id, title, summary, points, cta, Icon }, i) => (
                        <li key={id} id={id} className="list-none">
                            <Card className="h-full flex flex-col bg-card hover:shadow-lg transition-shadow border-t-4 border-t-primary">
                                <CardHeader>
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                            <Icon className="w-6 h-6" />
                                        </div>
                                        <span className="text-sm font-bold text-muted-foreground">{i + 1} of {OPPORTUNITIES.length}</span>
                                    </div>
                                    <CardTitle className="text-xl">{title}</CardTitle>
                                    <p className="text-muted-foreground">{summary}</p>
                                </CardHeader>
                                <CardContent className="flex flex-1 flex-col gap-4">
                                    <ul className="space-y-2">
                                        {points.map((p) => (
                                            <li key={p.text} className="flex gap-2 text-sm text-muted-foreground">
                                                <Check className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                                                {p.href ? (
                                                    <Link href={p.href} className="hover:text-foreground hover:underline">{p.text}</Link>
                                                ) : (
                                                    <span>{p.text}</span>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                    <Button variant="outline" className="mt-auto w-full h-11 justify-between" asChild>
                                        <Link href="#contact">
                                            {cta}
                                            <ArrowRight className="h-4 w-4" />
                                        </Link>
                                    </Button>
                                </CardContent>
                            </Card>
                        </li>
                    ))}
                </ol>
            </section>

            {/* Contact */}
            <section id="contact" className="py-16 md:py-24 bg-muted/20 border-t">
                <div className="container mx-auto max-w-6xl px-4 sm:px-6">
                    <div className="grid lg:grid-cols-2 gap-8 lg:gap-16">
                        <div className="space-y-4">
                            <h2 className="text-3xl font-bold font-headline">Partner enquiries</h2>
                            <p className="text-base sm:text-lg text-muted-foreground">
                                Choose your partnership type in the form and tell us a bit about what you do. We&apos;ll get back to you by email.
                            </p>
                            <p className="text-sm text-muted-foreground">
                                Benched doesn&apos;t handle payments: buyers pay sellers directly by PayID or cash on pickup.
                            </p>
                        </div>

                        <div>
                            <PartnerContactForm />
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer Simple */}
            <footer className="py-8 px-4 text-center text-muted-foreground text-sm border-t">
                <p>&copy; {new Date().getFullYear()} Benched Australia. All rights reserved. | <Link href="/" className="hover:underline">Back to Marketplace</Link></p>
            </footer>
        </div>
    );
}
