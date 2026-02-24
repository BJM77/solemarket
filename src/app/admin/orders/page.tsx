'use client';

import { useEffect, useState, useTransition, useCallback } from 'react';
import { getPendingEscrowOrders, markEscrowAsPaid } from '@/app/actions/admin-escrow';
import { getCurrentUserIdToken } from '@/lib/firebase/auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ShieldCheck, Clock, CheckCircle, Search, Inbox } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

export default function EscrowDashboard() {
    const [orders, setOrders] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();

    const fetchOrders = useCallback(async () => {
        setIsLoading(true);
        try {
            const token = await getCurrentUserIdToken();
            if (!token) throw new Error("Not authenticated");
            const res = await getPendingEscrowOrders(token);
            if (res.success && res.orders) {
                setOrders(res.orders);
            } else {
                throw new Error(res.error);
            }
        } catch (error: any) {
            toast({ title: "Failed to load escrows", description: error.message, variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    const handleApprove = (orderId: string) => {
        startTransition(async () => {
            try {
                const token = await getCurrentUserIdToken();
                if (!token) throw new Error("Not authenticated");
                const res = await markEscrowAsPaid(token, orderId);

                if (res.success) {
                    toast({ title: "Escrow Approved", description: "Seller has been notified to ship the item." });
                    fetchOrders(); // Refresh list
                } else {
                    throw new Error(res.error);
                }
            } catch (error: any) {
                toast({ title: "Approval Failed", description: error.message, variant: "destructive" });
            }
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <ShieldCheck className="h-8 w-8 text-primary" />
                        Escrow Ledger
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Verify incoming PayID transfers manually and clear funds for shipment.
                    </p>
                </div>
                <div className="flex items-center gap-4 bg-primary/10 px-4 py-2 rounded-xl border border-primary/20">
                    <div className="text-sm font-bold text-primary uppercase tracking-widest">Pending Volume</div>
                    <div className="text-2xl font-black text-gray-900 dark:text-white">
                        ${formatPrice(orders.reduce((acc, order) => acc + order.totalAmount, 0))}
                    </div>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-amber-500" />
                        Awaiting PayID Transfers
                    </CardTitle>
                    <CardDescription>
                        Match the incoming bank deposits using the exact PayID Reference code before approving.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                            <p className="text-muted-foreground font-medium">Scanning ledger...</p>
                        </div>
                    ) : orders.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
                                <Inbox className="h-10 w-10 text-slate-300" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Ledger is Empty</h3>
                            <p className="text-gray-500">No buyers are currently awaiting payment verification.</p>
                        </div>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead className="font-bold text-primary">PayID Reference</TableHead>
                                        <TableHead>Buyer</TableHead>
                                        <TableHead>Seller</TableHead>
                                        <TableHead className="text-right font-bold">Amount Due</TableHead>
                                        <TableHead className="text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {orders.map((order) => (
                                        <TableRow key={order.id}>
                                            <TableCell className="font-medium whitespace-nowrap">
                                                {new Date(order.createdAt).toLocaleDateString()}
                                                <div className="text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                            </TableCell>
                                            <TableCell className="font-mono font-black text-lg text-rose-600">
                                                {order.payIdReference || order.groupOrderId.substring(0, 8)}
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-medium">{order.buyerName}</div>
                                                <div className="text-xs text-muted-foreground line-clamp-1 max-w-[150px]">{order.buyerEmail}</div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="font-medium bg-slate-50">{order.sellerName}</Badge>
                                            </TableCell>
                                            <TableCell className="text-right text-lg font-black tracking-tight">
                                                ${formatPrice(order.totalAmount)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    onClick={() => handleApprove(order.id)}
                                                    disabled={isPending}
                                                    size="sm"
                                                    className="bg-emerald-600 hover:bg-emerald-700 font-bold"
                                                >
                                                    {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                                                    Mark as Paid
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
