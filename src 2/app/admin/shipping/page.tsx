'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
    Package,
    Printer,
    Truck,
    AlertCircle,
    Search,
    CheckCircle2,
    Loader2
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useUserPermissions } from '@/hooks/use-user-permissions';

// Mock Data for pending orders
const MOCK_ORDERS = [
    {
        id: 'ord_12345abc',
        itemTitle: 'Michael Jordan 1986 Fleer RC #57 PSA 8',
        buyerName: 'John Smith',
        status: 'pending_shipment',
        date: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
        shippingMethod: 'Express Post Signature',
    },
    {
        id: 'ord_98765xyz',
        itemTitle: 'Nike Air Max 1 x Parra (2018)',
        buyerName: 'Jane Doe',
        status: 'pending_shipment',
        date: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
        shippingMethod: 'Standard Parcel',
    }
];

export default function ShippingLabelsPage() {
    const { isSuperAdmin, isLoading: isPermissionsLoading } = useUserPermissions();
    const [orders, setOrders] = useState(MOCK_ORDERS);
    const [selectedOrder, setSelectedOrder] = useState<typeof MOCK_ORDERS[0] | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);

    // Form State
    const [weight, setWeight] = useState('1.5');
    const [length, setLength] = useState('30');
    const [width, setWidth] = useState('20');
    const [height, setHeight] = useState('15');

    const handleGenerateLabel = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsGenerating(true);
        setGeneratedUrl(null);

        // Simulate API call to Shippo/AusPost
        setTimeout(() => {
            setIsGenerating(false);
            // In a real app, this would be the secure URL to the PDF label
            setGeneratedUrl(`https://example.com/mock-label-${selectedOrder?.id}.pdf`);

            // Optimistically update order status
            if (selectedOrder) {
                setOrders(prev => prev.map(o => o.id === selectedOrder.id ? { ...o, status: 'label_created' } : o));
            }
        }, 2000);
    };

    if (isPermissionsLoading) return <div className="p-8 text-center text-muted-foreground animate-pulse">Checking credentials...</div>;
    if (!isSuperAdmin) return <div className="p-8 text-center text-red-500">Access Denied: Super Admin required.</div>;

    return (
        <div className="container mx-auto py-8 space-y-8">
            <PageHeader
                title="Shipping & Fulfillment"
                description="Manage pending orders, generate shipping labels via Shippo, and dispatch items."
            />

            <Alert className="bg-blue-50/50 text-blue-800 border-blue-200">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>API Integration Pending</AlertTitle>
                <AlertDescription>
                    This UI simulates the shipping workflow. The actual label generation will connect to the Shippo API once the production keys are configured.
                </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Orders List */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <Package className="h-5 w-5 text-primary" />
                                    Pending Shipments
                                </CardTitle>
                                <CardDescription>Orders waiting to be packed and shipped.</CardDescription>
                            </div>
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input type="search" placeholder="Search orders..." className="pl-8 w-[250px]" />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {orders.map(order => (
                                <div
                                    key={order.id}
                                    className={`flex flex-col md:flex-row gap-4 p-4 border rounded-xl transition-colors cursor-pointer ${selectedOrder?.id === order.id ? 'border-primary bg-primary/5' : 'hover:border-slate-300'
                                        }`}
                                    onClick={() => setSelectedOrder(order)}
                                >
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="font-mono text-xs text-muted-foreground">{order.id}</span>
                                            <span className="text-xs text-slate-500">{formatDistanceToNow(order.date, { addSuffix: true })}</span>
                                        </div>
                                        <h4 className="font-bold text-slate-800 leading-tight">{order.itemTitle}</h4>
                                        <p className="text-sm text-slate-600 mt-1">Buyer: {order.buyerName}</p>
                                    </div>
                                    <div className="flex flex-col items-end justify-between">
                                        <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                                            {order.status === 'label_created' ? 'Label Ready' : 'Pending'}
                                        </div>
                                        <span className="text-xs font-medium text-slate-500 mt-2 flex items-center gap-1">
                                            <Truck className="h-3 w-3" />
                                            {order.shippingMethod}
                                        </span>
                                    </div>
                                </div>
                            ))}
                            {orders.length === 0 && (
                                <div className="text-center p-8 text-muted-foreground">
                                    No pending orders found.
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Label Generator Sidebar */}
                <div>
                    <Card className="sticky top-24">
                        <CardHeader className="bg-slate-50 border-b">
                            <CardTitle className="text-lg">Generate Label</CardTitle>
                            <CardDescription>
                                {selectedOrder ? `For order ${selectedOrder.id}` : 'Select an order to generate a label'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6">
                            {selectedOrder ? (
                                <form onSubmit={handleGenerateLabel} className="space-y-6">
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="weight">Weight (kg)</Label>
                                            <Input id="weight" value={weight} onChange={e => setWeight(e.target.value)} required />
                                        </div>

                                        <div className="grid grid-cols-3 gap-2">
                                            <div className="space-y-2">
                                                <Label htmlFor="length" className="text-xs">Length (cm)</Label>
                                                <Input id="length" value={length} onChange={e => setLength(e.target.value)} required />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="width" className="text-xs">Width (cm)</Label>
                                                <Input id="width" value={width} onChange={e => setWidth(e.target.value)} required />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="height" className="text-xs">Height (cm)</Label>
                                                <Input id="height" value={height} onChange={e => setHeight(e.target.value)} required />
                                            </div>
                                        </div>
                                    </div>

                                    {generatedUrl ? (
                                        <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl space-y-3">
                                            <div className="flex items-center gap-2 text-emerald-700 font-bold">
                                                <CheckCircle2 className="h-5 w-5" />
                                                Label Generated successfully!
                                            </div>
                                            <Button className="w-full bg-emerald-600 hover:bg-emerald-700 tooltip" type="button" onClick={() => window.open(generatedUrl, '_blank')}>
                                                <Printer className="mr-2 h-4 w-4" />
                                                Print Label
                                            </Button>
                                        </div>
                                    ) : (
                                        <Button type="submit" className="w-full" disabled={isGenerating}>
                                            {isGenerating ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Connecting to Courier...
                                                </>
                                            ) : (
                                                <>
                                                    <Truck className="mr-2 h-4 w-4" />
                                                    Calculate Rates & Generate
                                                </>
                                            )}
                                        </Button>
                                    )}
                                </form>
                            ) : (
                                <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl">
                                    <Package className="h-12 w-12 mx-auto mb-2 text-slate-300" />
                                    <p className="text-sm">Select an order from the list to continue.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
