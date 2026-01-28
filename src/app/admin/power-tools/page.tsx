'use client';

import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Upload,
    FileSpreadsheet,
    Edit3,
    TrendingUp,
    Bell,
    BarChart3,
    QrCode,
    Package,
    Settings,
    Zap
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { SUPER_ADMIN_EMAILS, SUPER_ADMIN_UIDS } from '@/lib/constants';
import { getAdminStats, type AdminStats } from '@/app/actions/admin-stats';
import { useUserPermissions } from '@/hooks/use-user-permissions';

const powerTools = [
    {
        title: 'Bulk Image Lister',
        description: 'Upload multiple images and let AI create listings',
        icon: Upload,
        href: '/sell/bulk-lister',
        color: 'bg-blue-500',
    },
    {
        title: 'Bulk CSV Lister',
        description: 'Import products from CSV file with images',
        icon: FileSpreadsheet,
        href: '/sell/bulk-csv-lister',
        color: 'bg-green-500',
    },
    {
        title: 'Bulk Editor',
        description: 'Edit prices, conditions, and status for multiple items',
        icon: Edit3,
        href: '/admin/bulk-editor',
        color: 'bg-purple-500',
    },
    {
        title: 'Auto Repricing',
        description: 'Automatically match lowest prices in categories',
        icon: TrendingUp,
        href: '/admin/auto-repricing',
        color: 'bg-orange-500',
    },
    {
        title: 'Inventory Alerts',
        description: 'Get notified about low stock and trends',
        icon: Bell,
        href: '/admin/inventory-alerts',
        color: 'bg-red-500',
    },
    {
        title: 'Sales Analytics',
        description: 'View performance metrics and best selling times',
        icon: BarChart3,
        href: '/admin/analytics',
        color: 'bg-indigo-500',
    },
    {
        title: 'QR Codes',
        description: 'Generate and manage product QR codes',
        icon: QrCode,
        href: '/admin/qr-codes',
        color: 'bg-pink-500',
        comingSoon: true,
    },
    {
        title: 'Shipping Labels',
        description: 'Generate shipping labels via Shippo integration',
        icon: Package,
        href: '/admin/shipping',
        color: 'bg-cyan-500',
        comingSoon: true,
    },
];

export default function PowerToolsPage() {
    const { user, isUserLoading: isAuthLoading } = useUser();
    const { isSuperAdmin, isLoading: isPermissionsLoading } = useUserPermissions();
    const router = useRouter();
    const [stats, setStats] = useState<AdminStats | null>(null);

    const isUserLoading = isAuthLoading || isPermissionsLoading;

    useEffect(() => {
        if (!isUserLoading && !isSuperAdmin) {
            router.push('/');
        }
    }, [isSuperAdmin, isUserLoading, router]);

    useEffect(() => {
        const fetchStats = async () => {
            if (isSuperAdmin) {
                const data = await getAdminStats();
                setStats(data);
            }
        };
        fetchStats();
    }, [isSuperAdmin]);

    if (isUserLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="text-center">
                    <Settings className="h-12 w-12 animate-spin mx-auto text-muted-foreground" />
                    <p className="mt-4 text-muted-foreground">Loading...</p>
                </div>
            </div>
        );
    }

    if (!isSuperAdmin) {
        return null;
    }

    return (
        <div className="container mx-auto py-8">
            <PageHeader
                title="⚡ Power Tools"
                description="Super Admin tools for bulk operations and advanced seller features"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
                {powerTools.map((tool) => {
                    const Icon = tool.icon;
                    return (
                        <Card
                            key={tool.href}
                            className={`relative overflow-hidden transition-all hover:shadow-lg ${tool.comingSoon ? 'opacity-75' : ''}`}
                        >
                            <div className={`absolute top-0 right-0 w-32 h-32 ${tool.color} opacity-10 rounded-bl-full`} />

                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <div className={`p-3 rounded-lg ${tool.color} text-white`}>
                                        <Icon className="h-6 w-6" />
                                    </div>
                                    {tool.comingSoon && (
                                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full font-semibold">
                                            Coming Soon
                                        </span>
                                    )}
                                </div>
                                <CardTitle className="mt-4">{tool.title}</CardTitle>
                                <CardDescription>{tool.description}</CardDescription>
                            </CardHeader>

                            <CardContent>
                                <Button
                                    asChild={!tool.comingSoon}
                                    disabled={tool.comingSoon}
                                    className="w-full"
                                    variant={tool.comingSoon ? "outline" : "default"}
                                >
                                    {tool.comingSoon ? (
                                        <span>Coming Soon</span>
                                    ) : (
                                        <Link href={tool.href}>
                                            <Zap className="mr-2 h-4 w-4" />
                                            Open Tool
                                        </Link>
                                    )}
                                </Button>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Quick Stats Section */}
            <div className="mt-12 grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="pb-3">
                        <CardDescription>Total Listings</CardDescription>
                        <CardTitle className="text-3xl">
                            {stats ? stats.totalListings.toLocaleString() : '-'}
                        </CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-3">
                        <CardDescription>Active Sellers</CardDescription>
                        <CardTitle className="text-3xl">
                            {stats ? stats.activeSellers.toLocaleString() : '-'}
                        </CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-3">
                        <CardDescription>Total Revenue</CardDescription>
                        <CardTitle className="text-3xl">
                            {stats ? `$${stats.totalRevenue.toLocaleString()}` : '-'}
                        </CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-3">
                        <CardDescription>Pending Orders</CardDescription>
                        <CardTitle className="text-3xl">
                            {stats ? stats.pendingOrders.toLocaleString() : '-'}
                        </CardTitle>
                    </CardHeader>
                </Card>
            </div>
        </div>
    );
}
