'use client';

import { useState } from 'react';
import { useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Advertisement } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Plus, BarChart3, Eye, MousePointer } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const PLACEMENTS = [
    { id: 'home_top_banner', name: 'Home Top Banner', description: 'Displays at the very top of the homepage, below the ticker' },
    { id: 'home_hero_footer', name: 'Home Hero Footer', description: 'Displays below the main hero section on the homepage' },
    { id: 'grid_interstitial', name: 'Grid Interstitial', description: 'Displays within product grids' },
    { id: 'drops_header', name: 'Drops Header', description: 'Displays at the top of the Drops page' }
];

export default function AdsAdminPage() {
    const q = useMemoFirebase(() => query(collection(db, 'ads'), orderBy('createdAt', 'desc')), []);
    const { data: ads, isLoading } = useCollection<Advertisement>(q);

    return (
        <div className="space-y-6 p-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Ad Manager</h1>
                    <p className="text-muted-foreground">Manage advertising campaigns and placements.</p>
                </div>
                <Button asChild>
                    <Link href="/admin/ads/create">
                        <Plus className="mr-2 h-4 w-4" /> Create Campaign
                    </Link>
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
                        <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {ads?.filter(a => a.status === 'active').length || 0}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Impressions</CardTitle>
                        <Eye className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {ads?.reduce((acc, curr) => acc + (curr.impressions || 0), 0).toLocaleString()}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
                        <MousePointer className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {ads?.reduce((acc, curr) => acc + (curr.clicks || 0), 0).toLocaleString()}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Active Placements</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-3">
                        {PLACEMENTS.map(placement => {
                            const activeAd = ads?.find(ad => ad.placement === placement.id && ad.status === 'active');
                            return (
                                <div key={placement.id} className="p-4 border rounded-lg flex flex-col justify-between">
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <h4 className="font-bold">{placement.name}</h4>
                                            <Badge variant={activeAd ? 'default' : 'outline'}>
                                                {activeAd ? 'Filled' : 'Empty'}
                                            </Badge>
                                        </div>
                                        <p className="text-xs text-muted-foreground mb-4">{placement.description}</p>
                                    </div>
                                    {activeAd ? (
                                        <div className="space-y-2">
                                            <div className="h-24 w-full bg-gray-100 rounded-md overflow-hidden relative">
                                                <img src={activeAd.imageUrl} alt={activeAd.title} className="object-cover w-full h-full" />
                                            </div>
                                            <div className="text-sm">
                                                <div className="font-medium truncate">{activeAd.title}</div>
                                                <div className="text-xs text-muted-foreground truncate">{activeAd.advertiserName}</div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="h-24 w-full border-2 border-dashed rounded-md flex items-center justify-center text-sm text-muted-foreground bg-gray-50/50">
                                            No active campaign
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>All Campaigns</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {ads?.map((ad) => (
                            <div key={ad.id} className="flex items-center justify-between p-4 border rounded-lg">
                                <div className="flex items-center gap-4">
                                    <div className="h-16 w-24 bg-gray-100 rounded-md overflow-hidden relative">
                                        <img src={ad.imageUrl} alt={ad.title} className="object-cover w-full h-full" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold">{ad.title}</h4>
                                        <p className="text-sm text-muted-foreground">{ad.advertiserName} • {ad.placement}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-right">
                                        <div className="text-sm font-medium">{ad.impressions} views</div>
                                        <div className="text-xs text-muted-foreground">{ad.clicks} clicks</div>
                                    </div>
                                    <Badge variant={ad.status === 'active' ? 'default' : 'secondary'}>
                                        {ad.status}
                                    </Badge>
                                </div>
                            </div>
                        ))}
                        {(!ads || ads.length === 0) && (
                            <div className="text-center py-8 text-muted-foreground">
                                No campaigns found. Create one to get started.
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
