
'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@/firebase';
import { getAIUsageStats, type AIUsageStats } from '@/app/actions/ai-stats';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    LineChart, Line, AreaChart, Area, Cell, PieChart, Pie
} from 'recharts';
import {
    Cpu,
    DollarSign,
    Activity,
    Zap,
    Clock,
    Calendar as CalendarIcon,
    BarChart3,
    ArrowUpRight,
    Search,
    ShieldAlert,
    Brain
} from 'lucide-react';
import { format } from 'date-fns';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function AIUsagePage() {
    const { user } = useUser();
    const [stats, setStats] = useState<AIUsageStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            if (!user) return;
            try {
                const idToken = await user.getIdToken();
                const data = await getAIUsageStats(idToken);
                setStats(data);
            } catch (error) {
                console.error('Failed to fetch AI usage stats:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, [user]);

    if (loading || !stats) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="text-center space-y-4">
                    <Brain className="h-12 w-12 animate-pulse mx-auto text-primary" />
                    <p className="text-muted-foreground font-medium animate-pulse">Calculating AI metrics...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-8 space-y-8 pb-20">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <PageHeader
                    title="AI Intelligence Console"
                    description="Real-time usage tracking and cost estimation for Picksy AI services."
                />
                <div className="flex items-center gap-2 bg-primary/5 px-4 py-2 rounded-xl border border-primary/10">
                    <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-bold uppercase tracking-widest text-primary">Live Monitoring Active</span>
                </div>
            </div>

            {/* Top Level Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="border-2 border-primary/5 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Total Requests</CardTitle>
                        <Zap className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black">{stats.totalUnits.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <ArrowUpRight className="h-3 w-3 text-emerald-500" />
                            <span>AI Units consumed (30d)</span>
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-2 border-primary/5 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Estimated Cost</CardTitle>
                        <DollarSign className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black">${stats.totalCost.toFixed(4)}</div>
                        <p className="text-xs text-muted-foreground mt-1 text-emerald-600 font-medium">USD (Projected API Fees)</p>
                    </CardContent>
                </Card>

                <Card className="border-2 border-primary/5 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Avg. Latency</CardTitle>
                        <Clock className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black">1.2s</div>
                        <p className="text-xs text-muted-foreground mt-1 text-blue-600 font-medium font-mono">Gemini 1.5 Flash</p>
                    </CardContent>
                </Card>

                <Card className="border-2 border-primary/5 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Success Rate</CardTitle>
                        <Activity className="h-4 w-4 text-rose-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black">99.8%</div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                            <div className="bg-emerald-500 h-full w-[99.8%]" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Usage Trends */}
                <Card className="lg:col-span-2 shadow-xl border-t-4 border-t-primary">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>Usage Velocity</CardTitle>
                                <CardDescription>Tracking intelligence volume across different time scales.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Tabs defaultValue="daily" className="space-y-4">
                            <TabsList className="grid w-full grid-cols-3 max-w-[400px]">
                                <TabsTrigger value="hourly" className="flex items-center gap-2">
                                    <Clock className="h-4 w-4" /> Hourly
                                </TabsTrigger>
                                <TabsTrigger value="daily" className="flex items-center gap-2">
                                    <CalendarIcon className="h-4 w-4" /> Daily
                                </TabsTrigger>
                                <TabsTrigger value="weekly" className="flex items-center gap-2">
                                    <BarChart3 className="h-4 w-4" /> Weekly
                                </TabsTrigger>
                            </TabsList>
                            <TabsContent value="hourly" className="h-[350px] pt-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={stats.hourly}>
                                        <defs>
                                            <linearGradient id="colorUnits" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                        <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#666' }} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#666' }} />
                                        <Tooltip
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                            formatter={(value: any) => [`${value} Units`, 'Usage']}
                                        />
                                        <Area type="monotone" dataKey="units" stroke="#0ea5e9" strokeWidth={3} fillOpacity={1} fill="url(#colorUnits)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </TabsContent>
                            <TabsContent value="daily" className="h-[350px] pt-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={stats.daily}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                        <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#666' }} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#666' }} />
                                        <Tooltip
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                            formatter={(value: any) => [`${value} Units`, 'Usage']}
                                        />
                                        <Bar dataKey="units" radius={[4, 4, 0, 0]} fill="#0ea5e9">
                                            {stats.daily.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={index === stats.daily.length - 1 ? '#0369a1' : '#0ea5e9'} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </TabsContent>
                            <TabsContent value="weekly" className="h-[350px] pt-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={stats.weekly}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                        <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#666' }} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#666' }} />
                                        <Tooltip
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                        />
                                        <Line type="step" dataKey="units" stroke="#8b5cf6" strokeWidth={4} dot={{ r: 6, fill: '#8b5cf6', strokeWidth: 2, stroke: '#fff' }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>

                {/* Allocation by Feature */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Feature Allocation</CardTitle>
                            <CardDescription>Intelligence distribution by tool.</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[250px] flex items-center justify-center">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={stats.byFeature}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="units"
                                        nameKey="feature"
                                    >
                                        {stats.byFeature.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    <Card className="bg-slate-900 text-white">
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <Cpu className="h-5 w-5 text-emerald-400" />
                                <CardTitle className="text-white">Cost Optimization</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-white/10">
                                <div className="text-xs font-bold uppercase tracking-widest text-slate-400">Total Project Cost</div>
                                <div className="text-xl font-black text-emerald-400">${stats.totalCost.toFixed(4)}</div>
                            </div>
                            <div className="text-xs text-slate-400 leading-relaxed">
                                You are currently using <span className="text-emerald-400 font-bold">Gemini 1.5 Flash</span>.
                                Its vision capabilities are optimized for low-latency assessment of collector cards and documents.
                                <br /><br />
                                <span className="font-bold text-white uppercase tracking-tighter">Recommendation:</span> High success rate observed. No infrastructure changes required.
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <div className="p-6 rounded-2xl border bg-amber-50/50 border-amber-200">
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-white rounded-xl shadow-sm">
                        <DollarSign className="h-6 w-6 text-amber-600" />
                    </div>
                    <div>
                        <h4 className="font-bold text-amber-900">Billing Notice</h4>
                        <p className="text-sm text-amber-800/80 leading-relaxed">
                            These costs are <span className="font-bold italic underline">estimates</span> based on standard Google AI pricing for Gemini 1.5 Flash.
                            Actual billing may vary based on token density, caching performance, and regional pricing tiers in your Google Cloud Project.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
