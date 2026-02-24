'use client';

import { useEffect, useState, useTransition, useCallback } from 'react';
import { getPendingPayouts, markPayoutAsSettled } from '@/app/actions/admin-payouts';
import { getCurrentUserIdToken } from '@/lib/firebase/auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, DollarSign, Clock, CheckCircle, Search, Inbox, ExternalLink, ShieldCheck } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import Link from 'next/link';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function PayoutDashboard() {
    const [orders, setOrders] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();

    // Settlement state
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
    const [payoutReference, setPayoutReference] = useState('');

    const fetchOrders = useCallback(async () => {
        setIsLoading(true);
        try {
            const token = await getCurrentUserIdToken();
            if (!token) throw new Error("Not authenticated");
            const res = await getPendingPayouts(token);
            if (res.success && res.orders) {
                setOrders(res.orders);
            } else {
                throw new Error(res.error);
            }
        } catch (error: any) {
            toast({ title: "Failed to load payouts", description: error.message, variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    const handleSettleClick = (orderId: string) => {
        setSelectedOrderId(orderId);
        setPayoutReference('');
        setIsDialogOpen(true);
    };

    const handleConfirmSettlement = () => {
        if (!selectedOrderId) return;

        startTransition(async () => {
            try {
                const token = await getCurrentUserIdToken();
                if (!token) throw new Error("Not authenticated");
                const res = await markPayoutAsSettled(token, selectedOrderId, payoutReference);

                if (res.success) {
                    toast({ title: "Payout Settled", description: "The order payout has been successfully settled." });
                    setIsDialogOpen(false);
                    fetchOrders(); // Refresh list
                } else {
                    throw new Error(res.error);
                }
            } catch (error: any) {
                toast({ title: "Settlement Failed", description: error.message, variant: "destructive" });
            }
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <DollarSign className="h-8 w-8 text-primary" />
                        Payout Ledger
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Manage and settle funds to sellers for delivered orders.
                    </p>
                </div>
                <div className="flex items-center gap-4 bg-primary/10 px-4 py-2 rounded-xl border border-primary/20">
                    <div className="text-sm font-bold text-primary uppercase tracking-widest">Pending Payouts</div>
                    <div className="text-2xl font-black text-gray-900 dark:text-white">
                        ${formatPrice(orders.reduce((acc, order) => acc + (order.payoutAmount || 0), 0))}
                    </div>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-amber-500" />
                        Awaiting Payments to Sellers
                    </CardTitle>
                    <CardDescription>
                        Orders that have been marked as delivered by the buyer and are ready for seller payout.
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
                            <div className="h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100 dark:bg-slate-800 dark:border-slate-700">
                                <Inbox className="h-10 w-10 text-slate-300 dark:text-slate-600" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Ledger is Empty</h3>
                            <p className="text-gray-500 dark:text-gray-400">All payouts are settled, or no orders are currently delivered.</p>
                        </div>
                    ) : (
                        <div className="rounded-md border dark:border-slate-800">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Delivered Date</TableHead>
                                        <TableHead className="font-bold text-primary">Order Ref</TableHead>
                                        <TableHead>Seller</TableHead>
                                        <TableHead className="text-right">Order Total</TableHead>
                                        <TableHead className="text-right">Platform Fee</TableHead>
                                        <TableHead className="text-right font-bold">Net Payout</TableHead>
                                        <TableHead className="text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {orders.map((order) => (
                                        <TableRow key={order.id}>
                                            <TableCell className="font-medium whitespace-nowrap">
                                                {new Date(order.updatedAt).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell className="font-mono font-black text-sm text-rose-600">
                                                {order.payIdReference || order.groupOrderId?.substring(0, 8)}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col items-start space-y-1">
                                                    <Badge variant="outline" className="font-medium bg-slate-50 dark:bg-slate-900">{order.sellerName}</Badge>
                                                    {order.sellerPaypalMeLink ? (
                                                        <a
                                                            href={order.sellerPaypalMeLink.startsWith('http') ? order.sellerPaypalMeLink : `https://${order.sellerPaypalMeLink}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-xs text-blue-500 hover:text-blue-700 flex items-center gap-1"
                                                        >
                                                            PayPal.Me <ExternalLink className="h-3 w-3" />
                                                        </a>
                                                    ) : order.sellerBankDetails ? (
                                                        <div className="text-[10px] text-muted-foreground bg-slate-100 dark:bg-slate-800 p-1.5 rounded border border-slate-200 dark:border-slate-700 mt-1 max-w-[120px]">
                                                            <p className="font-bold text-[8px] uppercase text-slate-400 mb-0.5">Bank Details</p>
                                                            <p className="line-clamp-2">{order.sellerBankDetails}</p>
                                                        </div>
                                                    ) : (
                                                        <span className="text-[10px] text-muted-foreground italic">No Payment Method</span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right text-sm">
                                                ${formatPrice(order.totalAmount)}
                                            </TableCell>
                                            <TableCell className="text-right text-sm text-rose-500">
                                                -${formatPrice(order.platformFeeAmount || 0)}
                                                {order.hasFeeWaiver && (
                                                    <Badge variant="secondary" className="ml-2 text-[10px] bg-primary/20 text-primary border-0">Waived</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right text-lg font-black tracking-tight text-emerald-600 dark:text-emerald-400">
                                                ${formatPrice(order.payoutAmount || 0)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    onClick={() => handleSettleClick(order.id)}
                                                    disabled={isPending}
                                                    size="sm"
                                                    className="bg-emerald-600 hover:bg-emerald-700 font-bold"
                                                >
                                                    {isPending && selectedOrderId === order.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                                                    Mark as Settled
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

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirm Settlement</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to mark this payout as settled? Please record the transaction reference from your payment provider.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="reference">Transaction Reference (Optional)</Label>
                            <Input
                                id="reference"
                                placeholder="e.g. PayPal ID or Bank Ref"
                                value={payoutReference}
                                onChange={(e) => setPayoutReference(e.target.value)}
                                className="rounded-xl"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isPending}>Cancel</Button>
                        <Button onClick={handleConfirmSettlement} disabled={isPending} className="bg-emerald-600 hover:bg-emerald-700 font-bold">
                            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                            Confirm Payout
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
