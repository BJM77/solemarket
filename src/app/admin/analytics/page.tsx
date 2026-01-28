
'use client';

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import EmptyState from "@/components/ui/EmptyState";
import { BarChart as BarChartIcon, PieChart as PieChartIcon, Loader2 } from "lucide-react";
import { LineChart, PieChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, Line, Pie, Cell } from 'recharts';
import { getSalesAnalytics, getCategoryDistribution } from "@/services/analytics";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export default function AnalyticsPage() {
    const [salesData, setSalesData] = useState<any[]>([]);
    const [categoryData, setCategoryData] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            try {
                const [sales, categories] = await Promise.all([
                    getSalesAnalytics(),
                    getCategoryDistribution()
                ]);
                setSalesData(sales);
                setCategoryData(categories);
            } catch (error) {
                console.error("Failed to fetch analytics:", error);
            } finally {
                setIsLoading(false);
            }
        }
        fetchData();
    }, []);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground animate-pulse">Scanning Intelligence Matrix...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <PageHeader
                title="Intelligence Matrix"
                description="Predictive analytics and platform performance metrics."
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card className="shadow-lg border-primary/10">
                    <CardHeader className="border-b bg-slate-50/50">
                        <CardTitle className="flex items-center gap-2">
                            <BarChartIcon className="h-5 w-5 text-primary" />
                            Sales Performance
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                        {salesData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={salesData}>
                                    <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'white', borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                    />
                                    <Legend verticalAlign="top" height={36} />
                                    <Line
                                        type="monotone"
                                        name="Revenue ($)"
                                        dataKey="revenue"
                                        stroke="#2563eb"
                                        strokeWidth={3}
                                        dot={{ r: 4, fill: '#2563eb' }}
                                        activeDot={{ r: 6, strokeWidth: 0 }}
                                    />
                                    <Line
                                        type="monotone"
                                        name="Orders"
                                        dataKey="sales"
                                        stroke="#10b981"
                                        strokeWidth={2}
                                        dot={{ r: 3, fill: '#10b981' }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <EmptyState
                                icon={<BarChartIcon className="h-12 w-12 text-slate-300" />}
                                title="No Transactional Intelligence"
                                description="Data streams will initialize once the first sales are detected on the protocol."
                                className="h-[300px]"
                            />
                        )}
                    </CardContent>
                </Card>

                <Card className="shadow-lg border-primary/10">
                    <CardHeader className="border-b bg-slate-50/50">
                        <CardTitle className="flex items-center gap-2">
                            <PieChartIcon className="h-5 w-5 text-primary" />
                            Asset Distribution
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                        {categoryData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        dataKey="value"
                                        data={categoryData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={100}
                                        paddingAngle={5}
                                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    >
                                        {categoryData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'white', borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <EmptyState
                                icon={<PieChartIcon className="h-12 w-12 text-slate-300" />}
                                title="No Asset Data Found"
                                description="The matrix requires more listings to generate a meaningful distribution map."
                                className="h-[300px]"
                            />
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

