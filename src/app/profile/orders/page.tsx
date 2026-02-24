
'use client';

import { useState, useEffect } from 'react';
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
    Loader2,
    Clock,
    AlertTriangle,
    ShoppingBag
} from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import Image from 'next/image';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { lodgeDispute } from '@/app/actions/disputes';
import { confirmOrderReceipt } from '@/app/actions/order';
import { getCurrentUserIdToken } from '@/lib/firebase/auth';

export default function UserOrdersPage() {
    const { user } = useUser();
    const { toast } = useToast();
    const router = useRouter();
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Dispute state
    const [isDisputeOpen, setIsDisputeOpen] = useState(false);
    const [selectedOrderForDispute, setSelectedOrderForDispute] = useState<string | null>(null);
    const [disputeReason, setDisputeReason] = useState('');
    const [disputeDescription, setDisputeDescription] = useState('');
    const [isSubmittingDispute, setIsSubmittingDispute] = useState(false);

    // Confirm receipt state
    const [isConfirming, setIsConfirming] = useState<string | null>(null);

    const handleConfirmReceipt = async (orderId: string) => {
        if (!user) return;
        setIsConfirming(orderId);
        try {
            const token = await getCurrentUserIdToken();
            if (!token) throw new Error("Authentication error.");
            
            const result = await confirmOrderReceipt(token, orderId);
            if (result.success) {
                toast({ title: "Order Confirmed", description: "You have successfully confirmed receipt. The seller will now be paid." });
            } else {
                throw new Error(result.message);
            }
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setIsConfirming(null);
        }
    };

    useEffect(() => {
        if (!user?.uid) return;

        const q = query(
            collection(db, 'orders'),
            where('buyerId', '==', user.uid),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedOrders = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate() || new Date()
            }));
            setOrders(fetchedOrders);
            setLoading(false);
        }, (error) => {
            console.error("Order fetch error:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user?.uid]);

    const handleLodgeDispute = async () => {
        if (!selectedOrderForDispute || !user) return;
        if (!disputeReason || !disputeDescription) {
            toast({ title: "Please fill in all fields.", variant: "destructive" });
            return;
        }

        setIsSubmittingDispute(true);
        try {
            const result = await lodgeDispute({
                orderId: selectedOrderForDispute,
                initiatorId: user.uid,
                initiatorName: user.displayName || 'Unknown User',
                initiatorRole: 'buyer',
                reason: disputeReason,
                description: disputeDescription,
            });

            if (result.success) {
                toast({ title: "Dispute Lodged", description: result.message });
                setIsDisputeOpen(false);
                setSelectedOrderForDispute(null);
                setDisputeReason('');
                setDisputeDescription('');
            } else {
                throw new Error(result.message);
            }
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setIsSubmittingDispute(false);
        }
    };

    const handleStartChat = async (order: any) => {
        if (!user) return;

        try {
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
            const conversationData = {
                participantIds: [user.uid, order.sellerId],
                participants: {
                    [user.uid]: {
                        displayName: user.displayName || 'Buyer',
                        photoURL: user.photoURL || ''
                    },
                    [order.sellerId]: {
                        displayName: order.sellerName || 'Seller',
                        photoURL: ''
                    }
                },
                lastMessage: {
                    text: `Hello, I have a question about my order ${order.id.slice(-8)}.`,
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

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="h-10 w-10 animate-spin text-primary/40 mb-4" />
                <p className="text-slate-400 font-medium">Retrieving your purchase history...</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto py-8 px-4">
            <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
                    <ShoppingBag className="h-6 w-6 text-primary" />
                </div>
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900">My Purchases</h1>
                    <p className="text-slate-500">Track and manage your collectible acquisitions.</p>
                </div>
            </div>

            {orders.length === 0 ? (
                <div className="text-center py-24 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                    <Package className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-slate-900">No purchases yet</h3>
                    <p className="text-slate-500 mb-6">Start your collection by browsing the marketplace.</p>
                    <Button asChild>
                        <Link href="/">Browse Marketplace</Link>
                    </Button>
                </div>
            ) : (
                <div className="space-y-6">
                    {orders.map((order) => (
                        <Card key={order.id} className="border-none shadow-premium rounded-2xl overflow-hidden bg-white">
                            <CardHeader className="bg-slate-900 text-white py-4 px-6 flex flex-row items-center justify-between">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Order ID</p>
                                        <Badge variant="outline" className="border-white/20 text-white bg-white/10 text-[10px]">
                                            #{order.id.slice(-8).toUpperCase()}
                                        </Badge>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Clock className="h-3 w-3 text-slate-400" />
                                        <p className="text-xs font-bold text-slate-300">
                                            {format(order.createdAt, 'MMM d, yyyy')}
                                        </p>
                                    </div>
                                </div>
                                <Badge className={cn(
                                    "px-3 py-1 rounded-full font-black text-[10px] uppercase border-none",
                                    order.status === 'processing' ? "bg-amber-100 text-amber-700" :
                                        order.status === 'shipped' ? "bg-blue-100 text-blue-700" :
                                            order.status === 'delivered' ? "bg-emerald-100 text-emerald-700" :
                                                "bg-slate-100 text-slate-700"
                                )}>
                                    {order.status}
                                </Badge>
                            </CardHeader>
                            <CardContent className="p-6">
                                <div className="space-y-4 mb-6">
                                    {order.items.map((item: any) => (
                                        <div key={item.id} className="flex items-center gap-4">
                                            <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-slate-100 border flex-shrink-0">
                                                <Image src={item.image || item.imageUrls?.[0]} alt={item.title} fill className="object-cover" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-slate-900 line-clamp-1">{item.title}</p>
                                                <p className="text-xs text-slate-500">Qty: {item.quantity} · ${formatPrice(item.price)} ea</p>
                                            </div>
                                            <p className="font-black text-slate-900">${formatPrice(item.price * item.quantity)}</p>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-50">
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Seller</p>
                                        <p className="text-sm font-bold text-slate-700">{order.sellerName || 'Private Seller'}</p>
                                    </div>
                                    <div className="space-y-1 text-right">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Total Amount</p>
                                        <p className="text-xl font-black text-primary">${formatPrice(order.totalAmount)}</p>
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="bg-slate-50/50 p-4 flex gap-2 flex-wrap">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex-1 font-bold rounded-xl gap-2"
                                    onClick={() => handleStartChat(order)}
                                >
                                    <MessageSquare className="h-4 w-4" />
                                    Contact Seller
                                </Button>
                                {['processing', 'shipped'].includes(order.status) && (
                                    <Button
                                        size="sm"
                                        className="flex-1 font-bold rounded-xl gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                                        onClick={() => handleConfirmReceipt(order.id)}
                                        disabled={isConfirming === order.id}
                                    >
                                        {isConfirming === order.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                                        Confirm Receipt
                                    </Button>
                                )}
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-slate-400 hover:text-rose-600 gap-2 font-bold px-3 w-full sm:w-auto mt-2 sm:mt-0"
                                    onClick={() => {
                                        setSelectedOrderForDispute(order.id);
                                        setIsDisputeOpen(true);
                                    }}
                                >
                                    <AlertTriangle className="h-4 w-4" />
                                    Report Issue
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}

            {/* Dispute Dialog */}
            <Dialog open={isDisputeOpen} onOpenChange={setIsDisputeOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-rose-600">
                            <AlertTriangle className="h-5 w-5" />
                            Report an Issue
                        </DialogTitle>
                        <DialogDescription>
                            Please describe the issue with Order #{selectedOrderForDispute?.slice(-8).toUpperCase()}. An administrator will review your claim.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase text-slate-500">Reason</Label>
                            <Select value={disputeReason} onValueChange={setDisputeReason}>
                                <SelectTrigger className="rounded-xl border-slate-200 h-12">
                                    <SelectValue placeholder="Categorize your issue" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Item not received">Item not received</SelectItem>
                                    <SelectItem value="Item not as described">Item not as described</SelectItem>
                                    <SelectItem value="Damaged during shipping">Damaged during shipping</SelectItem>
                                    <SelectItem value="Fraudulent activity">Fraudulent activity</SelectItem>
                                    <SelectItem value="Other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase text-slate-500">Detailed Description</Label>
                            <Textarea
                                placeholder="Provide as much detail as possible..."
                                value={disputeDescription}
                                onChange={(e) => setDisputeDescription(e.target.value)}
                                className="min-h-[120px] rounded-xl border-slate-200"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" className="rounded-xl font-bold h-12" onClick={() => setIsDisputeOpen(false)}>Cancel</Button>
                        <Button
                            variant="destructive"
                            onClick={handleLodgeDispute}
                            disabled={isSubmittingDispute}
                            className="bg-rose-600 hover:bg-rose-700 font-bold rounded-xl h-12 flex-1"
                        >
                            {isSubmittingDispute ? <Loader2 className="animate-spin" /> : "Submit Report"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function cn(...inputs: any[]) {
    return inputs.filter(Boolean).join(' ');
}
