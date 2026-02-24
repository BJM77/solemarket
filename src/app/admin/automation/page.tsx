'use client';

import { useEffect, useState, useTransition, useCallback } from 'react';
import { getOrdersNeedingNudge, sendReceiptNudge } from '@/app/actions/nudge-actions';
import { getCurrentUserIdToken } from '@/lib/firebase/auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, BellRing, Clock, Send, Inbox, ShieldCheck, Mail } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { formatDistanceToNow } from 'date-fns';

export default function AutomationDashboard() {
    const [orders, setOrders] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();

    const fetchOrders = useCallback(async () => {
        setIsLoading(true);
        try {
            const token = await getCurrentUserIdToken();
            if (!token) throw new Error("Not authenticated");
            const res = await getOrdersNeedingNudge(token);
            if (res.success && res.orders) {
                setOrders(res.orders);
            } else {
                throw new Error(res.error);
            }
        } catch (error: any) {
            toast({ title: "Failed to load orders", description: error.message, variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    const handleSendNudge = (orderId: string) => {
        startTransition(async () => {
            try {
                const token = await getCurrentUserIdToken();
                if (!token) throw new Error("Not authenticated");
                const res = await sendReceiptNudge(token, orderId);

                if (res.success) {
                    toast({ title: "Nudge Sent", description: "The buyer has been notified via email and in-app alert." });
                    fetchOrders(); // Refresh list
                } else {
                    throw new Error(res.error);
                }
            } catch (error: any) {
                toast({ title: "Failed to send", description: error.message, variant: "destructive" });
            }
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <BellRing className="h-8 w-8 text-primary" />
                        Buyer Nudges
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Remind buyers to confirm receipt of their items so you can payout sellers.
                    </p>
                </div>
                <div className="flex items-center gap-4 bg-primary/10 px-4 py-2 rounded-xl border border-primary/20">
                    <div className="text-sm font-bold text-primary uppercase tracking-widest">Needing Attention</div>
                    <div className="text-2xl font-black text-gray-900 dark:text-white">
                        {orders.length}
                    </div>
                </div>
            </div>

            <Card className="border-none shadow-premium-sm overflow-hidden rounded-2xl">
                <CardHeader className="bg-slate-50/50 border-b">
                    <CardTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-amber-500" />
                        Shipped &gt; 3 Days Ago
                    </CardTitle>
                    <CardDescription>
                        These buyers haven&apos;t confirmed delivery yet. Send a manual nudge to prompt them.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                            <p className="text-muted-foreground font-medium">Scanning shipped orders...</p>
                        </div>
                    ) : orders.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-24 text-center">
                            <div className="h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100 dark:bg-slate-800 dark:border-slate-700">
                                <Inbox className="h-10 w-10 text-slate-300 dark:text-slate-600" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Everything is Current</h3>
                            <p className="text-gray-500 dark:text-gray-400">No buyers currently require a reminder nudge.</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-50/50">
                                    <TableHead className="pl-6">Buyer</TableHead>
                                    <TableHead>Order Ref</TableHead>
                                    <TableHead>Last Activity</TableHead>
                                    <TableHead className="text-center">Nudges Sent</TableHead>
                                    <TableHead className="text-right pr-6">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {orders.map((order) => (
                                    <TableRow key={order.id} className="group hover:bg-slate-50/30 transition-colors">
                                        <TableCell className="pl-6 py-4">
                                            <div className="font-bold text-slate-900 dark:text-white">{order.buyerName}</div>
                                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                                                <Mail className="h-3 w-3" /> {order.buyerEmail}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="font-mono bg-white dark:bg-slate-950">
                                                {order.payIdReference || order.groupOrderId?.substring(0, 8)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-sm font-medium">
                                                {formatDistanceToNow(new Date(order.updatedAt), { addSuffix: true })}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                {[...Array(3)].map((_, i) => (
                                                    <div 
                                                        key={i} 
                                                        className={`h-2 w-2 rounded-full ${i < (order.nudgeCount || 0) ? 'bg-primary shadow-[0_0_8px_rgba(242,108,13,0.5)]' : 'bg-slate-200 dark:bg-slate-800'}`} 
                                                    />
                                                ))}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right pr-6">
                                            <Button
                                                onClick={() => handleSendNudge(order.id)}
                                                disabled={isPending || (order.nudgeCount || 0) >= 3}
                                                size="sm"
                                                variant={(order.nudgeCount || 0) >= 3 ? "ghost" : "default"}
                                                className="font-bold rounded-xl gap-2"
                                            >
                                                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                                {(order.nudgeCount || 0) >= 3 ? 'Max Nudges' : 'Send Nudge'}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-6 rounded-2xl">
                <h4 className="font-bold text-amber-800 dark:text-amber-400 mb-2 flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5" />
                    How Nudges Work
                </h4>
                <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-2 list-disc list-inside">
                    <li>Orders appear here <strong>3 days</strong> after they are marked as shipped if not yet delivered.</li>
                    <li>Each nudge sends a professional email and an in-app notification to the buyer.</li>
                    <li>Maximum of <strong>3 nudges</strong> per order to prevent spamming.</li>
                    <li>Once a buyer clicks <strong>&quot;Confirm Receipt&quot;</strong>, the order moves to the Payout Ledger.</li>
                </ul>
            </div>
        </div>
    );
}
