'use client';

import Link from 'next/link';
import {
    Camera,
    Footprints,
    Layers,
    ScanLine,
    Search,
    Sparkles,
    Upload,
    ArrowRight,
    Wrench,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/layout/PageHeader';
import { useUserPermissions } from '@/hooks/use-user-permissions';

interface SellerTool {
    title: string;
    badge: string;
    description: string;
    bestFor: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
}

const SELLER_TOOLS: SellerTool[] = [
    {
        title: 'ShoeCam',
        badge: 'Sneakers',
        description: 'Snap your basketball sneakers, let AI identify the brand, model, and condition, and push straight to your listings.',
        bestFor: 'Fast 2nd-hand sneaker listing from your phone',
        href: '/shoecam',
        icon: Footprints,
        color: 'bg-orange-500',
    },
    {
        title: 'Autofast – Quick Scan',
        badge: 'Cards',
        description: 'Auto-capture straight, cropped front and back card photos. Each card saves as a draft automatically while AI fills details in the background.',
        bestFor: 'Everyday rapid single-card scanning',
        href: '/sell/autofast',
        icon: ScanLine,
        color: 'bg-amber-600',
    },
    {
        title: 'Fast Bulk',
        badge: 'Batch Cards',
        description: 'Upload hundreds of card photos at once. We pair front and back images, run AI fill, and create drafts ready to price and publish.',
        bestFor: 'Listing large stacks from existing photos',
        href: '/sell/fast-bulk',
        icon: Upload,
        color: 'bg-blue-600',
    },
    {
        title: 'Proload',
        badge: 'Import',
        description: 'Take a screenshot of an existing Facebook Marketplace listing and let AI convert it into a Benched listing in seconds.',
        bestFor: 'Moving your Facebook Marketplace inventory over',
        href: '/sell/proload',
        icon: Sparkles,
        color: 'bg-emerald-700',
    },
    {
        title: 'SamCam – Booth Studio',
        badge: 'Advanced',
        description: 'Full studio capture workspace with review queues, collection tracking, and batch export for high-volume card booths.',
        bestFor: 'Dedicated camera booth & team review workflows',
        href: '/samcam',
        icon: Camera,
        color: 'bg-violet-600',
    },
    {
        title: 'Research Lab',
        badge: 'Pricing',
        description: 'Search recent Australian eBay sold listings with instant Average, Median, Low, and High market comps.',
        bestFor: 'Checking fair market value before listing',
        href: '/research',
        icon: Search,
        color: 'bg-slate-800',
    },
];

export default function SellerToolsHubPage() {
    const { canSell, isSuperAdmin, isLoading } = useUserPermissions();

    if (isLoading) {
        return (
            <div className="container mx-auto py-12 px-4 text-center text-muted-foreground animate-pulse">
                Loading seller tools...
            </div>
        );
    }

    if (!canSell && !isSuperAdmin) {
        return (
            <div className="container mx-auto max-w-xl py-16 px-4 text-center space-y-4">
                <Wrench className="h-10 w-10 mx-auto text-muted-foreground" />
                <h1 className="text-2xl font-bold">Seller Tools</h1>
                <p className="text-muted-foreground">
                    Seller tools are available to verified Benched sellers. Apply to start selling basketball sneakers and cards.
                </p>
                <Button asChild>
                    <Link href="/sell">Become a Seller</Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="container mx-auto max-w-6xl py-8 px-4 space-y-8">
            <PageHeader
                title="Seller Tools"
                description="Choose the fastest workflow to scan, import, price, and list your basketball sneakers and cards."
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {SELLER_TOOLS.map((tool) => {
                    const Icon = tool.icon;
                    return (
                        <Card key={tool.href} className="flex flex-col justify-between hover:shadow-md transition-shadow">
                            <CardHeader>
                                <div className="flex items-center justify-between mb-3">
                                    <div className={`p-2.5 rounded-xl text-white ${tool.color}`}>
                                        <Icon className="h-5 w-5" />
                                    </div>
                                    <Badge variant="secondary" className="text-xs font-semibold">
                                        {tool.badge}
                                    </Badge>
                                </div>
                                <CardTitle className="text-lg">{tool.title}</CardTitle>
                                <CardDescription className="text-sm leading-relaxed">
                                    {tool.description}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="text-xs text-muted-foreground bg-muted/60 rounded-lg px-3 py-2 flex items-center gap-2">
                                    <Layers className="h-3.5 w-3.5 shrink-0 text-primary" />
                                    <span><strong>Best for:</strong> {tool.bestFor}</span>
                                </div>
                                <Button asChild className="w-full">
                                    <Link href={tool.href}>
                                        Open {tool.title.split(' – ')[0]}
                                        <ArrowRight className="ml-2 h-4 w-4" />
                                    </Link>
                                </Button>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
