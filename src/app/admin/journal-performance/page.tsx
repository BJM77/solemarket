import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, MousePointerClick, DollarSign } from 'lucide-react';

export default function JournalPerformanceDashboard() {
    return (
        <div className="p-8 max-w-6xl mx-auto">
            <h1 className="text-3xl font-bold mb-6">Journal Performance (Last 30 Days)</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                            <Activity className="h-4 w-4" /> Total Article Views
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">1,204</div>
                        <p className="text-xs text-emerald-500 mt-1">+12% vs last month</p>
                    </CardContent>
                </Card>
                
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                            <MousePointerClick className="h-4 w-4" /> Outbound Product Clicks
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-emerald-500">84</div>
                        <p className="text-xs text-muted-foreground mt-1">7% Click-through Rate</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                            <DollarSign className="h-4 w-4" /> Attributed Revenue
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-emerald-500">$3,400</div>
                        <p className="text-xs text-muted-foreground mt-1">From 4 successful sales</p>
                    </CardContent>
                </Card>
            </div>

            <h2 className="text-xl font-bold mb-4">Top Performing Articles</h2>
            <Card>
                <CardContent className="p-0">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted">
                            <tr>
                                <th className="p-4 font-medium">Article</th>
                                <th className="p-4 font-medium">Views</th>
                                <th className="p-4 font-medium">Product Clicks</th>
                                <th className="p-4 font-medium">Sales Attributed</th>
                                <th className="p-4 font-medium">Revenue</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="border-t">
                                <td className="p-4 font-bold">How to Spot Fake Kobe 6 Protros</td>
                                <td className="p-4 text-muted-foreground">842</td>
                                <td className="p-4 font-bold text-emerald-500">62</td>
                                <td className="p-4 text-emerald-500">3</td>
                                <td className="p-4 font-bold">$2,800</td>
                            </tr>
                        </tbody>
                    </table>
                </CardContent>
            </Card>
            
            <div className="mt-8 bg-blue-500/10 text-blue-500 p-4 rounded-md text-sm">
                <p className="font-bold mb-1">Attribution Logic</p>
                <p>Sales are attributed to the Journal if the buyer clicked a link with <code className="bg-black/20 px-1 py-0.5 rounded text-white">?ref=journal&article=[slug]</code> and completed a purchase within 24 hours.</p>
            </div>
        </div>
    );
}
