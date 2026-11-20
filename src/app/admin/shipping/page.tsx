'use client';

import { useState, useEffect } from 'react';
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
    CheckCircle2,
    Loader2,
    RefreshCw
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useUserPermissions } from '@/hooks/use-user-permissions';
import { useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { getPendingOrdersForShipping, createShippingLabel, PendingOrder } from './actions';

export default function ShippingLabelsPage() {
    const { isSuperAdmin, isLoading: isPermissionsLoading } = useUserPermissions();
    const { user } = useUser();
    const { toast } = useToast();

    const [orders, setOrders] = useState<PendingOrder[]>([]);
    const [selectedOrder, setSelectedOrder] = useState<PendingOrder | null>(null);
    const [isLoadingOrders, setIsLoadingOrders] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);

    // Form State
    const [weight, setWeight] = useState('1.5');
    const [length, setLength] = useState('30');
    const [width, setWidth] = useState('20');
    const [height, setHeight] = useState('15');

    const loadOrders = async () => {
        if (!user) return;
        setIsLoadingOrders(true);
        try {
            const token = await user.getIdToken();
            const res = await getPendingOrdersForShipping(token);
            if (res.success) {
                setOrders(res.orders);
                if (res.orders.length > 0 && !selectedOrder) {
                    setSelectedOrder(res.orders[0]);
                }
            } else {
                toast({
                    title: 'Notice',
                    description: res.message || 'Could not load orders.',
                });
            }
        } catch (err: any) {
            console.error('Failed to load orders', err);
        } finally {
            setIsLoadingOrders(false);
        }
    };

    useEffect(() => {
        if (isSuperAdmin && user) {
            loadOrders();
        }
    }, [isSuperAdmin, user]);

    const handleGenerateLabel = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedOrder || !user) return;

        setIsGenerating(true);
        setGeneratedUrl(null);

        try {
            const token = await user.getIdToken();
            const res = await createShippingLabel(token, selectedOrder.id, {
                weightKg: parseFloat(weight) || 1,
                lengthCm: parseFloat(length) || 10,
                widthCm: parseFloat(width) || 10,
                heightCm: parseFloat(height) || 10,
            });

            if (res.success && res.labelUrl) {
                setGeneratedUrl(res.labelUrl);
                toast({
                    title: 'Label Generated',
                    description: res.message,
                });
                // Update local status
                setOrders(prev =>
                    prev.map(o =>
                        o.id === selectedOrder.id
                            ? { ...o, status: 'label_created', labelUrl: res.labelUrl, trackingNumber: res.trackingNumber }
                            : o
                    )
                );
                setSelectedOrder(prev => (prev ? { ...prev, status: 'label_created', labelUrl: res.labelUrl, trackingNumber: res.trackingNumber } : null));
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Generation Failed',
                    description: res.message || 'Could not create shipping label.',
                });
            }
        } catch (err: any) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: err?.message || 'Error communicating with shipping service.',
            });
        } finally {
            setIsGenerating(false);
        }
    };

    if (isPermissionsLoading) {
        return <div className="p-8 text-center text-muted-foreground animate-pulse">Checking credentials...</div>;
    }
    if (!isSuperAdmin) {
        return <div className="p-8 text-center text-red-500">Access Denied: Super Admin required.</div>;
    }

    return (
        <div className="container mx-auto py-8 space-y-8">
            <PageHeader
                title="Shipping & Fulfillment"
                description="Manage pending orders, generate shipping labels via Shippo, and dispatch items."
            />

            <Alert className="bg-orange-50/50 text-orange-800 border-orange-200">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Shippo Dispatch Ready</AlertTitle>
                <AlertDescription>
                    Connects directly to orders awaiting dispatch. If Shippo API keys are not supplied in the environment, fallback sandbox tracking will be generated automatically.
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
                                <CardDescription>Orders requiring label generation and dispatch</CardDescription>
                            </div>
                            <Button variant="ghost" size="sm" onClick={loadOrders} disabled={isLoadingOrders}>
                                <RefreshCw className={`h-4 w-4 ${isLoadingOrders ? 'animate-spin' : ''}`} />
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {isLoadingOrders ? (
                            <div className="flex justify-center p-8">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : orders.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                No orders currently pending shipment.
                            </div>
                        ) : (
                            orders.map((order) => {
                                const isSelected = selectedOrder?.id === order.id;
                                let timeAgo = 'recently';
                                try {
                                    timeAgo = formatDistanceToNow(new Date(order.createdAt), { addSuffix: true });
                                } catch (e) {
                                    // ignore invalid date
                                }

                                return (
                                    <div
                                        key={order.id}
                                        onClick={() => {
                                            setSelectedOrder(order);
                                            setGeneratedUrl(order.labelUrl || null);
                                        }}
                                        className={`p-4 border rounded-lg cursor-pointer transition-colors flex items-center justify-between ${
                                            isSelected
                                                ? 'border-primary bg-primary/5'
                                                : 'hover:border-foreground/20'
                                        }`}
                                    >
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-sm">{order.id}</span>
                                                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 font-medium">
                                                    {order.shippingMethod}
                                                </span>
                                                {order.status === 'label_created' && (
                                                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-medium flex items-center gap-1">
                                                        <CheckCircle2 className="h-3 w-3" />
                                                        Label Ready
                                                    </span>
                                                )}
                                            </div>
                                            <p className="font-medium">{order.itemTitle}</p>
                                            <p className="text-sm text-muted-foreground">
                                                Buyer: {order.buyerName} • Ordered {timeAgo}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <Button
                                                variant={isSelected ? 'default' : 'outline'}
                                                size="sm"
                                            >
                                                Select
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </CardContent>
                </Card>

                {/* Fulfillment Sidebar */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Truck className="h-5 w-5 text-primary" />
                            Package Details
                        </CardTitle>
                        <CardDescription>
                            {selectedOrder ? `Configuring ${selectedOrder.id}` : 'Select an order to continue'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {selectedOrder ? (
                            <form onSubmit={handleGenerateLabel} className="space-y-4">
                                <div>
                                    <Label htmlFor="weight">Weight (kg)</Label>
                                    <Input
                                        id="weight"
                                        type="number"
                                        step="0.1"
                                        value={weight}
                                        onChange={(e) => setWeight(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    <div>
                                        <Label htmlFor="length">L (cm)</Label>
                                        <Input
                                            id="length"
                                            type="number"
                                            value={length}
                                            onChange={(e) => setLength(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="width">W (cm)</Label>
                                        <Input
                                            id="width"
                                            type="number"
                                            value={width}
                                            onChange={(e) => setWidth(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="height">H (cm)</Label>
                                        <Input
                                            id="height"
                                            type="number"
                                            value={height}
                                            onChange={(e) => setHeight(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full mt-6"
                                    disabled={isGenerating}
                                >
                                    {isGenerating ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Generating Label...
                                        </>
                                    ) : (
                                        'Create Shipping Label'
                                    )}
                                </Button>

                                {(generatedUrl || selectedOrder.labelUrl) && (
                                    <div className="pt-4 border-t space-y-3">
                                        <Alert className="bg-emerald-50 text-emerald-800 border-emerald-200">
                                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                            <AlertTitle>Label Ready</AlertTitle>
                                            <AlertDescription className="text-xs break-all">
                                                Tracking: {selectedOrder.trackingNumber || 'Generated'}
                                            </AlertDescription>
                                        </Alert>

                                        <Button
                                            variant="outline"
                                            className="w-full border-emerald-600 text-emerald-700 hover:bg-emerald-50"
                                            onClick={() => window.open(generatedUrl || selectedOrder.labelUrl!, '_blank')}
                                        >
                                            <Printer className="mr-2 h-4 w-4" />
                                            Download / Print PDF
                                        </Button>
                                    </div>
                                )}
                            </form>
                        ) : (
                            <div className="py-8 text-center text-muted-foreground">
                                No order selected.
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
