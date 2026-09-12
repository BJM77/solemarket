'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import dynamic from 'next/dynamic';

const AnalyticsCharts = dynamic(() => import('@/components/seller/analytics/AnalyticsCharts').then(mod => mod.AnalyticsCharts), { 
  ssr: false, 
  loading: () => <div className="h-[400px] w-full flex items-center justify-center bg-gray-50 rounded-lg animate-pulse">Loading charts...</div>
});
import { DollarSign, ShoppingBag, TrendingUp, Users } from 'lucide-react';
import { formatPrice } from '@/lib/utils';

export default function SellerAnalyticsPage() {
  // Hardcoded summary stats for the MVP
  const stats = [
    {
      title: 'Total Revenue',
      value: 12450,
      change: '+12.5%',
      icon: DollarSign,
      color: 'text-green-600 bg-green-100',
    },
    {
      title: 'Orders',
      value: 45,
      change: '+4.3%',
      icon: ShoppingBag,
      color: 'text-blue-600 bg-blue-100',
    },
    {
      title: 'Conversion Rate',
      value: '3.2%',
      change: '-1.1%',
      icon: TrendingUp,
      color: 'text-purple-600 bg-purple-100',
    },
    {
      title: 'Store Visits',
      value: 1205,
      change: '+24%',
      icon: Users,
      color: 'text-orange-600 bg-orange-100',
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">Track your store's performance and growth.</p>
        </div>
        {/* Placeholder for Date Range Picker */}
        <div className="bg-white border rounded-md px-4 py-2 text-sm font-medium shadow-sm cursor-pointer hover:bg-gray-50">
          Last 7 Days
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <Card key={index} className="border-none shadow-sm hover:shadow-md transition-all">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-full ${stat.color}`}>
                <stat.icon className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {typeof stat.value === 'number' && stat.title.includes('Revenue')
                  ? formatPrice(stat.value)
                  : stat.value}
              </div>
              <p className={`text-xs ${stat.change.startsWith('+') ? 'text-green-600' : 'text-red-600'} font-medium mt-1`}>
                {stat.change} <span className="text-muted-foreground font-normal">from last week</span>
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Section */}
      <AnalyticsCharts />
    </div>
  );
}
