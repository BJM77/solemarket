import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { aggregateMarketPulse, SaleDataPoint } from '@/lib/market-pulse/aggregation';

// Mock data to preview the logic until connected to live Firestore orders/sales
const mockSalesData: SaleDataPoint[] = [
    { id: '1', title: 'Jordan 1 Chicago', price: 600, soldAt: new Date(Date.now() - 10 * 86400000), category: 'shoes', isVaultVerified: true, grade: 'New' },
    { id: '2', title: 'Jordan 1 Chicago', price: 550, soldAt: new Date(Date.now() - 15 * 86400000), category: 'shoes', isVaultVerified: false, grade: 'New' },
    { id: '3', title: 'Jordan 1 Chicago', price: 620, soldAt: new Date(Date.now() - 2 * 86400000), category: 'shoes', isVaultVerified: true, grade: 'New' },
    { id: '4', title: 'Jordan 1 Chicago', price: 480, soldAt: new Date(Date.now() - 20 * 86400000), category: 'shoes', isVaultVerified: false, grade: 'New' },
    // Outliers
    { id: '5', title: 'Jordan 1 Chicago', price: 1, soldAt: new Date(Date.now() - 5 * 86400000), category: 'shoes', isVaultVerified: false }, // Too low
    { id: '6', title: 'Jordan 1 Chicago', price: 15000, soldAt: new Date(Date.now() - 3 * 86400000), category: 'shoes', isVaultVerified: false }, // Too high statistical
];

export default function MarketPulsePreviewPage() {
    const pulseData = aggregateMarketPulse(mockSalesData, 'shoes');

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <h1 className="text-3xl font-bold mb-6">Market Pulse Preview Dashboard</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm text-muted-foreground">Overall Market Average (90d)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">${pulseData.averagePrice}</div>
                        <p className="text-xs text-muted-foreground mt-1">Based on {pulseData.volume} valid sales</p>
                    </CardContent>
                </Card>
                
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm text-muted-foreground">Vault Verified Average</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-emerald-500">${pulseData.vaultVerified.averagePrice}</div>
                        <Badge className="mt-2" variant={pulseData.vaultVerified.premiumOverMarket > 0 ? 'default' : 'secondary'}>
                            +{pulseData.vaultVerified.premiumOverMarket}% Premium
                        </Badge>
                    </CardContent>
                </Card>
            </div>

            <h2 className="text-xl font-bold mb-4">Recent Included Sales</h2>
            <Card>
                <CardContent className="p-0">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted">
                            <tr>
                                <th className="p-4 font-medium">Item</th>
                                <th className="p-4 font-medium">Price</th>
                                <th className="p-4 font-medium">Date</th>
                                <th className="p-4 font-medium">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pulseData.recentSales.map((sale, i) => (
                                <tr key={i} className="border-t">
                                    <td className="p-4">{sale.title} {sale.grade && <Badge variant="outline" className="ml-2">{sale.grade}</Badge>}</td>
                                    <td className="p-4 font-bold">${sale.price}</td>
                                    <td className="p-4 text-muted-foreground">{sale.soldAt.toLocaleDateString()}</td>
                                    <td className="p-4">
                                        {sale.isVaultVerified ? (
                                            <Badge className="bg-emerald-500 hover:bg-emerald-600">Vault Verified</Badge>
                                        ) : (
                                            <Badge variant="secondary">Unverified P2P</Badge>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </CardContent>
            </Card>

            <div className="mt-8 bg-amber-500/10 text-amber-600 p-4 rounded-md text-sm">
                <p className="font-bold mb-1">Data Quality Guards Active</p>
                <p>Initial Dataset: {mockSalesData.length} records</p>
                <p>After IQR & Boundary Filtering: {pulseData.volume} records kept ({mockSalesData.length - pulseData.volume} outliers rejected)</p>
            </div>
        </div>
    );
}
