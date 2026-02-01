
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import Image from 'next/image';
import Link from 'next/link';
import { CheckCircle2, ShoppingBag, AlertTriangle, MessageSquare, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { formatPrice } from '@/lib/utils';
import { lodgeDispute } from '@/app/actions/disputes';
import { useUser } from '@/firebase';

export default function ConfirmationPage() {
    const [orders, setOrders] = useState<any[]>([]);
    const [isDisputeOpen, setIsDisputeOpen] = useState(false);
    const [selectedOrderForDispute, setSelectedOrderForDispute] = useState<string | null>(null);
    const [disputeReason, setDisputeReason] = useState('');
    const [disputeDescription, setDisputeDescription] = useState('');
    const [isSubmittingDispute, setIsSubmittingDispute] = useState(false);

    const router = useRouter();
    const { toast } = useToast();
    const { user } = useUser();

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
            } else {
                throw new Error(result.message);
            }
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setIsSubmittingDispute(false);
        }
    };

    useEffect(() => {
        const savedOrders = sessionStorage.getItem('lastOrders');
        if (savedOrders) {
            try {
                const parsed = JSON.parse(savedOrders);
                setOrders(Array.isArray(parsed) ? parsed : [parsed]);
            } catch {
                router.push('/');
            }
        } else {
            router.push('/');
        }
    }, [router]);

    if (orders.length === 0) {
        return (
            <div className="container mx-auto px-4 py-16 text-center">
                <ShoppingBag className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                <h1 className="text-2xl font-bold text-gray-800 mb-2">Looking for an order?</h1>
                <p className="text-gray-600 mb-6">We can't find any recent order details.</p>
                <Button asChild>
                    <Link href="/">Continue Shopping</Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12">
            <div className="container mx-auto px-4 w-full">
                <div className="max-w-2xl mx-auto text-center mb-10">
                    <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 className="w-12 h-12 text-emerald-600" />
                    </div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">Order Confirmed!</h1>
                    <p className="text-lg text-slate-600">Thank you for your purchase. We've notified the sellers.</p>
                    {orders[0]?.groupOrderId && (
                        <p className="text-xs font-mono text-slate-400 mt-2 uppercase tracking-widest">Global Ref: {orders[0].groupOrderId}</p>
                    )}
                </div>

                <div className="max-w-2xl mx-auto space-y-6">
                    {orders.map((order, idx) => (
                        <Card key={order.id || idx} className="border-none shadow-xl overflow-hidden rounded-2xl">
                            <CardHeader className="bg-slate-900 text-white py-4 px-6">
                                <div className="flex justify-between items-center">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Order Details</p>
                                        <CardTitle className="text-base font-bold">Sold by {order.sellerName || 'Private Seller'}</CardTitle>
                                    </div>
                                    <Badge variant="outline" className="border-slate-700 text-slate-300 bg-white/5 backdrop-blur-sm px-3 py-1">
                                        {order.status}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="p-6">
                                <div className="space-y-4">
                                    {order.items.map((item: any) => (
                                        <div key={item.id} className="flex items-center gap-4 group">
                                            <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0 border border-slate-100 transition-transform group-hover:scale-105">
                                                <Image src={item.image || item.imageUrls?.[0]} alt={item.title} fill className="object-cover" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-slate-900 line-clamp-1 text-sm">{item.title}</p>
                                                <p className="text-xs text-slate-500 font-medium">Qty: {item.quantity} · ${formatPrice(item.price)} per unit</p>
                                            </div>
                                            <p className="font-black text-slate-900 text-sm whitespace-nowrap">${formatPrice(item.price * item.quantity)}</p>
                                        </div>
                                    ))}
                                </div>
                                <Separator className="my-6 bg-slate-100" />
                                <div className="space-y-3">
                                    <div className="flex justify-between text-xs font-medium">
                                        <span className="text-slate-500">Subtotal</span>
                                        <span className="text-slate-900">${formatPrice(order.subtotal)}</span>
                                    </div>
                                    <div className="flex justify-between text-xs font-medium">
                                        <span className="text-slate-500">Shipping & Handling</span>
                                        <span className="text-slate-900">{order.shippingCost === 0 ? 'Free' : `$${formatPrice(order.shippingCost)}`}</span>
                                    </div>
                                    <div className="flex justify-between text-xs font-medium">
                                        <span className="text-slate-500">Estimated Tax</span>
                                        <span className="text-slate-900">${formatPrice(order.taxAmount)}</span>
                                    </div>
                                    <div className="flex justify-between font-black text-xl pt-2 text-slate-900 border-t border-slate-50">
                                        <span>Total</span>
                                        <span className="text-primary">${formatPrice(order.totalAmount)}</span>
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="bg-slate-50/50 border-t border-slate-100/50 p-4">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-[10px] font-bold text-slate-400 hover:text-rose-600 gap-2 h-auto py-1 px-2 transition-colors uppercase tracking-tight"
                                    onClick={() => {
                                        setSelectedOrderForDispute(order.id);
                                        setIsDisputeOpen(true);
                                    }}
                                >
                                    <AlertTriangle className="h-3 w-3" />
                                    Lodge Conflict Protocol (Report Issue)
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}

                    <div className="flex flex-col sm:flex-row gap-4 mt-8 pt-8 border-t border-slate-200">
                        <Button size="lg" className="flex-1 font-bold rounded-xl h-12" asChild>
                            <Link href="/">Back to Marketplace</Link>
                        </Button>
                        <Button variant="outline" size="lg" className="flex-1 font-bold rounded-xl h-12 border-slate-200" asChild>
                            <Link href="/profile/orders">View Purchases</Link>
                        </Button>
                    </div>
                </div>
            </div>

            <Dialog open={isDisputeOpen} onOpenChange={setIsDisputeOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-rose-600">
                            <AlertTriangle className="h-5 w-5" />
                            Conflict Resolution Protocol
                        </DialogTitle>
                        <DialogDescription>
                            Identify the discrepancy with this shipment. An administrator will review your claim and mediate a resolution.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase text-slate-500">Reason</Label>
                            <Select value={disputeReason} onValueChange={setDisputeReason}>
                                <SelectTrigger className="rounded-lg">
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
                            <Label className="text-xs font-bold uppercase text-slate-500">Detailed Evidence</Label>
                            <Textarea
                                placeholder="Provide as much detail as possible..."
                                value={disputeDescription}
                                onChange={(e) => setDisputeDescription(e.target.value)}
                                className="min-h-[120px] rounded-lg"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDisputeOpen(false)}>Cancel</Button>
                        <Button
                            variant="destructive"
                            onClick={handleLodgeDispute}
                            disabled={isSubmittingDispute}
                            className="bg-rose-600 hover:bg-rose-700 font-bold"
                        >
                            {isSubmittingDispute ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <MessageSquare className="mr-2 h-4 w-4" />}
                            Initialize Protocol
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
