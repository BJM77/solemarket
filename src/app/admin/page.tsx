
'use client';

import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Package, Users, Settings, ShieldAlert, FileText, Mail, Brain } from "lucide-react";
import Link from 'next/link';
import { AdminStatsGrid } from "@/components/admin/StatsGrid";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { getPlatformStats } from "@/app/actions/stats";
import { useEffect, useState } from "react";
import { useUser } from "@/firebase";

interface PlatformStats {
    totalRevenue: number;
    activeSellers: number;
    suspendedSellers: number;
    pendingApprovals: number;
    totalItems: number;
}

const adminSections = [
    {
        title: "Analytics",
        icon: <BarChart className="h-8 w-8 text-primary" />,
        href: "/admin/analytics",
        description: "Review platform performance metrics."
    },
    {
        title: "Manage Listings",
        icon: <Package className="h-8 w-8 text-primary" />,
        href: "/admin/products",
        description: "Oversee, edit, or remove any product listing."
    },
    {
        title: "Integrity Center",
        icon: <ShieldAlert className="h-8 w-8 text-primary" />,
        href: "/admin/moderation",
        description: "Analyze listings and manage platform risk."
    },
    {
        title: "Customer Enquiries",
        icon: <Mail className="h-8 w-8 text-primary" />,
        href: "/admin/enquiries",
        description: "Manage concierge and consignment requests."
    },
    {
        title: "User Management",
        icon: <Users className="h-8 w-8 text-primary" />,
        href: "/admin/users",
        description: "Manage accounts, roles, and seller approvals."
    },
    {
        title: "AI Usage",
        icon: <Brain className="h-8 w-8 text-primary" />,
        href: "/admin/ai-usage",
        description: "Monitor AI requests and token costs."
    },
];


export default function AdminDashboardPage() {
    const { user } = useUser();
    const [stats, setStats] = useState<PlatformStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchStats = async () => {
            if (!user) return;
            setIsLoading(true);
            try {
                // Force refresh the ID token to ensure it hasn't expired
                const idToken = await user.getIdToken(true);

                // Using the server action to fetch stats
                const fetchedStats = await getPlatformStats(idToken);
                if (fetchedStats.error) {
                    throw new Error(fetchedStats.error);
                }
                setStats({
                    totalRevenue: fetchedStats.totalRevenue || 0,
                    totalItems: fetchedStats.totalItems || 0,
                    activeSellers: fetchedStats.activeSellers || 0,
                    suspendedSellers: fetchedStats.suspendedSellers || 0,
                    pendingApprovals: fetchedStats.pendingApprovals || 0
                });
            } catch (error: any) {
                console.error("Failed to fetch platform stats", error);
                setError(error.message);
            } finally {
                setIsLoading(false);
            }
        };
        fetchStats();
    }, [user]);

    const displayStats = {
        revenue: stats?.totalRevenue || 0,
        pendingApprovals: stats?.pendingApprovals || 0,
        sellers: stats?.activeSellers || 0,
        items: stats?.totalItems || 0,
    };

    return (
        <div>
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
                <h1 className="text-4xl lg:text-5xl font-black tracking-tighter mb-2">
                    Admin Dashboard
                </h1>
                <p className="text-muted-foreground font-medium tracking-wide uppercase text-xs">
                    Manage all aspects of the Benched marketplace.
                </p>
            </motion.div>

            <div className="mt-8">
                {isLoading ? (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <Skeleton className="h-28 rounded-2xl" />
                        <Skeleton className="h-28 rounded-2xl" />
                        <Skeleton className="h-28 rounded-2xl" />
                        <Skeleton className="h-28 rounded-2xl" />
                    </div>
                ) : error ? (
                    <div className="bg-destructive/10 text-destructive border border-destructive/20 p-4 rounded-lg">
                        <p className="font-bold">Error Loading Stats</p>
                        <p className="text-sm">{error}</p>
                    </div>
                ) : (
                    <AdminStatsGrid stats={displayStats} />
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mt-8">
                {adminSections.map((section, i) => (
                    <motion.div
                        key={section.title}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 + i * 0.1 }}
                    >
                        <Link href={section.href}>
                            <Card className="hover:-translate-y-2 transition-transform duration-300 h-full rounded-xl p-4">
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <CardTitle className="text-lg font-bold tracking-tight">{section.title}</CardTitle>
                                    <div className="p-3 bg-primary/10 rounded-xl">
                                        {section.icon}
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground">{section.description}</p>
                                </CardContent>
                            </Card>
                        </Link>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
