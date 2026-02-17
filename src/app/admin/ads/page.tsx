'use client';

import { useState } from 'react';
import { useCollection } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Advertisement } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Plus, BarChart3, Eye, MousePointer } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function AdsAdminPage() {
    const q = query(collection(db, 'ads'), orderBy('createdAt', 'desc'));
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
