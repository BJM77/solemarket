
'use client';

import { useState, useEffect, useTransition } from 'react';
import { useUser } from '@/firebase';
import { db } from '@/lib/firebase/config';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Package,
    Truck,
    CheckCircle2,
    MessageSquare,
    ExternalLink,
    Loader2,
    MapPin,
    Clock,
    MoreHorizontal,
    Printer,
    Search
} from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import Image from 'next/image';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { updateOrderStatus } from '@/app/actions/order';
import { getCurrentUserIdToken } from '@/lib/firebase/auth';
import { useRouter } from 'next/navigation';

export function SellerOrders({ limit }: { limit?: number }) {
    const { user } = useUser();
    const { toast } = useToast();
    const router = useRouter();
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isPending, startTransition] = useTransition();
    const [selectedOrder, setSelectedOrder] = useState<any>(null);
    const [trackingCarrier, setTrackingCarrier] = useState('');
    const [trackingNumber, setTrackingNumber] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    useEffect(() => {
        if (!user?.uid) return;

        const q = query(
            collection(db, 'orders'),
            where('sellerId', '==', user.uid),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            let fetchedOrders = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate() || new Date()
            }));

            if (limit) {
                fetchedOrders = fetchedOrders.slice(0, limit);
            }

            setOrders(fetchedOrders);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user?.uid, limit]);

    const handleUpdateStatus = (orderId: string, status: string, tracking?: { carrier: string, trackingNumber: string }) => {
        startTransition(async () => {
            const idToken = await getCurrentUserIdToken();
            if (!idToken) return;

            const result = await updateOrderStatus(idToken, orderId, status, tracking);
            if (result.success) {
                toast({ title: "Status Updated", description: result.message });
                setSelectedOrder(null);
                setTrackingCarrier('');
                setTrackingNumber('');
            } else {
                toast({ title: "Error", description: result.message, variant: "destructive" });
            }
        });
    };

    const handleStartChat = async (order: any) => {
        if (!user) return;

        // Find if conversation already exists
        const q = query(
            collection(db, 'conversations'),
            where('participantIds', 'array-contains', user.uid),
            where('orderContext.id', '==', order.id)
        );

        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
            router.push(`/messages/${snapshot.docs[0].id}`);
            return;
        }

        // Create new conversation
        try {
            const conversationData = {
                participantIds: [user.uid, order.buyerId],
                participants: {
                    [user.uid]: {
                        displayName: user.displayName || 'Seller',
                        photoURL: user.photoURL || ''
                    },
                    [order.buyerId]: {
                        displayName: order.buyerName || 'Buyer',
                        photoURL: ''
                    }
                },
                lastMessage: {
                    text: `Hello, I'm the seller for your order ${order.id}.`,
                    senderId: user.uid,
                    timestamp: serverTimestamp()
                },
                orderContext: {
                    id: order.id,
                    status: order.status,
                    total: order.totalAmount
                },
                createdAt: serverTimestamp()
            };

            const docRef = await addDoc(collection(db, 'conversations'), conversationData);

            // Add first message
            await addDoc(collection(docRef, 'messages'), {
                senderId: user.uid,
                text: conversationData.lastMessage.text,
                timestamp: serverTimestamp()
            });

            router.push(`/messages/${docRef.id}`);
        } catch (error) {
            console.error("Failed to start chat:", error);
            toast({ title: "Error", description: "Failed to start conversation.", variant: "destructive" });
        }
    };

    const filteredOrders = orders.filter(order =>
        statusFilter === 'all' ? true : order.status === statusFilter
    );

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-200">
                <Loader2 className="h-10 w-10 animate-spin text-primary/40 mb-4" />
                <p className="text-slate-400 font-medium">Synchronizing Secure Ledger...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Filter Hub */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
                    {['all', 'processing', 'shipped', 'delivered', 'cancelled'].map((status) => (
                        <Button
                            key={status}
                            variant={statusFilter === status ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setStatusFilter(status)}
                            className="capitalize rounded-full font-bold px-5"
                        >
                            {status}
                        </Button>
                    ))}
                </div>
                <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-hover:text-primary transition-colors" />
                    <Input
                        placeholder="Search orders..."
                        className="pl-10 w-full md:w-64 bg-white border-slate-200 rounded-full focus:ring-primary shadow-sm"
                    />
                </div>
            </div>

            {filteredOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 bg-white rounded-3xl border shadow-sm text-center px-6">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                        <Package className="h-10 w-10 text-slate-200" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">No Active Orders</h3>
                    <p className="text-slate-500 max-w-xs">When customers purchase your items, they will appear here for management and fulfillment.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6">
                    {filteredOrders.map((order) => (
                        <Card key={order.id} className="border-none shadow-premium hover:shadow-premium-hover transition-all duration-300 rounded-2xl overflow-hidden bg-white">
                            <div className="flex flex-col lg:flex-row">
                                {/* Left Side: Order Info */}
                                <div className="flex-1 p-6">
                                    <div className="flex items-start justify-between mb-6">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-3">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Order ID</p>
                                                <Badge variant="outline" className="font-mono text-[10px] bg-slate-50 border-slate-200 text-slate-600 rounded-md">
                                                    #{order.id.slice(-8).toUpperCase()}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Clock className="h-3.5 w-3.5 text-slate-400" />
                                                <p className="text-sm font-bold text-slate-600">
                                                    {format(order.createdAt, 'MMM d, yyyy · h:mm a')}
                                                </p>
                                            </div>
                                        </div>
                                        <Badge
                                            className={cn(
                                                "px-4 py-1.5 rounded-full font-black text-[10px] uppercase tracking-tighter border-none",
                                                order.status === 'processing' ? "bg-amber-100 text-amber-700" :
                                                    order.status === 'shipped' ? "bg-blue-100 text-blue-700" :
                                                        order.status === 'delivered' ? "bg-emerald-100 text-emerald-700" :
                                                            "bg-slate-100 text-slate-700"
                                            )}
                                        >
                                            {order.status}
                                        </Badge>
                                    </div>

                                    <div className="space-y-4">
                                        {order.items.map((item: any) => (
                                            <div key={item.id} className="flex items-center gap-4 group">
                                                <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-slate-100 border border-slate-100">
                                                    <Image src={item.image} alt={item.title} fill className="object-cover" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-bold text-slate-900 truncate">{item.title}</p>
                                                    <p className="text-xs text-slate-500 font-medium">Qty: {item.quantity} · ${formatPrice(item.price)} ea</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="mt-8 pt-6 border-t border-slate-50 flex flex-wrap gap-6 items-center">
                                        <div className="space-y-1">
                                            <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Buyer Instance</p>
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-slate-900 flex items-center justify-center text-[10px] text-white font-bold">
                                                    {order.buyerName?.[0] || 'U'}
                                                </div>
                                                <p className="text-xs font-bold text-slate-700">{order.buyerName}</p>
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Delivery Logistics</p>
                                            <div className="flex items-center gap-2">
                                                {order.shippingMethod === 'shipping' ? (
                                                    <Truck className="h-3.5 w-3.5 text-slate-600" />
                                                ) : (
                                                    <MapPin className="h-3.5 w-3.5 text-slate-600" />
                                                )}
                                                <p className="text-xs font-bold text-slate-700 capitalize">{order.shippingMethod}</p>
                                            </div>
                                        </div>
                                        <div className="space-y-1 ml-auto text-right">
                                            <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Profit Impact</p>
                                            <p className="text-lg font-black text-slate-900">${formatPrice(order.totalAmount)}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Right Side: Actions Tab */}
                                <div className="w-full lg:w-72 bg-slate-50/50 border-l border-slate-100 p-6 flex flex-col gap-3">
                                    <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Operational Controls</p>

                                    {order.status === 'processing' && (
                                        <Dialog open={selectedOrder === order.id} onOpenChange={(o) => setSelectedOrder(o ? order.id : null)}>
                                            <DialogTrigger asChild>
                                                <Button className="w-full font-bold rounded-xl gap-2 bg-slate-900 hover:bg-black text-white py-6">
                                                    <Truck className="h-4 w-4" />
                                                    Initialize Shipment
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent className="rounded-3xl border-none shadow-2xl">
                                                <DialogHeader>
                                                    <DialogTitle className="text-2xl font-black">Shipment Deployment</DialogTitle>
                                                    <DialogDescription className="font-medium">
                                                        Enter tracking parameters for Order #{order.id.slice(-8).toUpperCase()}.
                                                    </DialogDescription>
                                                </DialogHeader>
                                                <div className="space-y-6 py-4">
                                                    <div className="space-y-2">
                                                        <Label className="text-xs font-bold uppercase text-slate-400">Carrier Authority</Label>
                                                        <Input
                                                            placeholder="e.g. FedEx, UPS, Australia Post"
                                                            value={trackingCarrier}
                                                            onChange={(e) => setTrackingCarrier(e.target.value)}
                                                            className="rounded-xl border-slate-200 h-12 font-bold"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label className="text-xs font-bold uppercase text-slate-400">Tracking Serial</Label>
                                                        <Input
                                                            placeholder="Enter tracking number"
                                                            value={trackingNumber}
                                                            onChange={(e) => setTrackingNumber(e.target.value)}
                                                            className="rounded-xl border-slate-200 h-12 font-bold"
                                                        />
                                                    </div>
                                                </div>
                                                <DialogFooter className="gap-2 sm:gap-0">
                                                    <Button variant="outline" className="rounded-xl font-bold h-12" onClick={() => setSelectedOrder(null)}>Abort</Button>
                                                    <Button
                                                        className="rounded-xl font-bold h-12 flex-1"
                                                        onClick={() => handleUpdateStatus(order.id, 'shipped', { carrier: trackingCarrier, trackingNumber: trackingNumber })}
                                                        disabled={isPending || !trackingCarrier || !trackingNumber}
                                                    >
                                                        {isPending ? <Loader2 className="animate-spin" /> : "Deploy Tracking"}
                                                    </Button>
                                                </DialogFooter>
                                            </DialogContent>
                                        </Dialog>
                                    )}

                                    {order.status === 'shipped' && (
                                        <Button
                                            variant="outline"
                                            className="w-full font-bold rounded-xl gap-2 border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 py-6"
                                            onClick={() => handleUpdateStatus(order.id, 'delivered')}
                                            disabled={isPending}
                                        >
                                            <CheckCircle2 className="h-4 w-4" />
                                            Confirm Delivery
                                        </Button>
                                    )}

                                    <Button
                                        variant="outline"
                                        className="w-full font-bold rounded-xl gap-2 hover:bg-white py-6"
                                        onClick={() => handleStartChat(order)}
                                    >
                                        <MessageSquare className="h-4 w-4" />
                                        Inquire Buyer
                                    </Button>

                                    <Button variant="ghost" className="w-full font-bold rounded-xl gap-2 text-slate-400 hover:text-slate-900">
                                        <Printer className="h-4 w-4" />
                                        Print Index Card
                                    </Button>

                                    {order.status === 'processing' && (
                                        <Button
                                            variant="ghost"
                                            className="w-full font-bold rounded-xl gap-2 text-slate-400 hover:text-rose-600 mt-auto opacity-50 hover:opacity-100"
                                            onClick={() => handleUpdateStatus(order.id, 'cancelled')}
                                            disabled={isPending}
                                        >
                                            Terminate Order
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}

function cn(...inputs: any[]) {
    return inputs.filter(Boolean).join(' ');
}
