'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreditCard, Gem, Upload, Layers, CheckCircle, Sparkles, Shield, FileText, Loader2 } from 'lucide-react';
import { StaggerContainer, FadeIn } from '@/components/animations/FadeIn';
import { useUserPermissions } from '@/hooks/use-user-permissions';

export default function SellPage() {
    const { isSuperAdmin, canSell, isLoading } = useUserPermissions();

    const sellingOptions = [
        {
            icon: Upload,
            title: "Create a Listing",
            description: "Manually list any collectible. Perfect for single, unique items.",
            href: "/sell/create",
            cta: "List an Item"
        },
        {
            icon: FileText,
            title: "Bulk CSV Lister",
            description: "Upload a CSV file with image names to create multiple listings at once.",
            href: "/sell/bulk-csv-lister",
            cta: "Bulk Upload"
        },
        {
            icon: Layers,
            title: "Bulk AI Lister",
            description: "Upload photos of multiple items and let AI generate listings for you.",
            href: "/sell/bulk-lister",
            cta: "List in Bulk"
        },
        {
            icon: Gem,
            title: "Sell Coins & Bullion",
            description: "Specialized tools and categories for numismatics and precious metals.",
            href: "/sell/create?type=Coins",
            cta: "Sell Coins"
        }
    ];

    const features = [
        { icon: Sparkles, text: "AI-powered pricing and descriptions" },
        { icon: CheckCircle, text: "Access to a trusted community of collectors" },
        { icon: Layers, text: "Tools for bulk listing and management" },
    ];

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }

    if (!isSuperAdmin && !canSell) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50">
                 <main className="container mx-auto px-4 py-12 md:py-20 text-center">
                    <div className="max-w-2xl mx-auto">
                        <FadeIn>
                             <div className="mx-auto bg-primary/10 p-6 rounded-full w-fit mb-6">
                                <Shield className="h-12 w-12 text-primary" />
                            </div>
                            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gray-900 font-headline">
                                Viewing Mode
                            </h1>
                            <p className="mt-6 text-lg text-muted-foreground">
                                Product listing is currently restricted to administrators. You can browse and purchase items from our curated collections.
                            </p>
                            <Button asChild size="lg" className="mt-8">
                                <Link href="/browse">Browse Collectibles</Link>
                            </Button>
                        </FadeIn>
                    </div>
                </main>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50">
            <main className="container mx-auto px-4 py-12 md:py-20">
                <div className="text-center max-w-3xl mx-auto">
                    <FadeIn>
                        <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-gray-900 font-headline">
                            Turn Your Collection into Cash
                        </h1>
                        <p className="mt-6 text-lg md:text-xl text-muted-foreground">
                            Picksy provides powerful, AI-driven tools to make selling your collectibles faster and more profitable than ever before.
                        </p>
                         <Button asChild size="lg" className="mt-8">
                            <Link href="/sell/dashboard">View My Listings</Link>
                        </Button>
                    </FadeIn>
                </div>

                <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-16">
                    {sellingOptions.map((option, i) => (
                        <FadeIn key={option.title} delay={i * 0.1}>
                            <Card className="h-full flex flex-col text-center hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                                <CardHeader className="flex-1">
                                    <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit mb-4">
                                        <option.icon className="h-8 w-8 text-primary" />
                                    </div>
                                    <CardTitle>{option.title}</CardTitle>
                                    <p className="text-sm text-muted-foreground pt-2">{option.description}</p>
                                </CardHeader>
                                <CardContent>
                                    <Button className="w-full" asChild>
                                        <Link href={option.href}>{option.cta}</Link>
                                    </Button>
                                </CardContent>
                            </Card>
                        </FadeIn>
                    ))}
                </StaggerContainer>

                <FadeIn delay={0.5} className="mt-20">
                    <div className="text-center max-w-2xl mx-auto">
                        <h2 className="text-3xl font-bold text-gray-900">Why Sell on Picksy?</h2>
                        <ul className="mt-8 space-y-4 text-left">
                            {features.map((feature, i) => (
                                <li key={i} className="flex items-center gap-3 bg-white p-4 rounded-lg border">
                                    <feature.icon className="h-6 w-6 text-green-500" />
                                    <span className="text-md text-gray-700">{feature.text}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </FadeIn>
            </main>
        </div>
    );
}
