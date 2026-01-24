
'use client';

import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import EmptyState from "@/components/ui/EmptyState";
import { BarChart as BarChartIcon, PieChart as PieChartIcon } from "lucide-react";
import { BarChart, LineChart, PieChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, Bar, Line, Pie } from 'recharts';

// Removed mock data
const salesData: any[] = [];
const categoryData: any[] = [];

export default function AnalyticsPage() {
    return (
        <div>
            <PageHeader
                title="Intelligence Matrix"
                description="Predictive analytics and platform performance metrics."
            />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Sales Over Time</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {salesData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={salesData}>
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend />
                                    <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" />
                                    <Line type="monotone" dataKey="sales" stroke="hsl(var(--accent))" />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                             <EmptyState
                                icon={<BarChartIcon className="h-12 w-12" />}
                                title="No Sales Data"
                                description="Sales data will appear here once you start making sales."
                                className="h-[300px]"
                            />
                        )}
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>Category Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                       {categoryData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie dataKey="value" data={categoryData} fill="hsl(var(--primary))" label />
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                       ) : (
                             <EmptyState
                                icon={<PieChartIcon className="h-12 w-12" />}
                                title="No Category Data"
                                description="Category distribution will be shown here as items are listed."
                                className="h-[300px]"
                            />
                       )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
