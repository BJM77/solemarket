
'use client';

import { useState, useTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Rocket, ShieldCheck, Landmark, Loader2, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { connectStripeAction } from '@/app/actions/stripe';
import { getCurrentUserIdToken } from '@/lib/firebase/auth';

export function StripeConnect({ stripeEnabled = false, stripeAccountId = '' }: { stripeEnabled?: boolean, stripeAccountId?: string }) {
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();

    const handleConnect = () => {
        startTransition(async () => {
            const idToken = await getCurrentUserIdToken();
            if (!idToken) return;

            const result = await connectStripeAction(idToken);
            if (result.success) {
                toast({ title: "Secure Payouts Active", description: result.message });
                window.location.reload();
            } else {
                toast({ title: "Authorization Failed", description: result.message, variant: "destructive" });
            }
        });
    };

    return (
        <Card className="border-none shadow-premium rounded-2xl overflow-hidden bg-gradient-to-br from-slate-900 to-slate-800 text-white">
            <CardHeader className="pb-6">
                <div className="flex justify-between items-start">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <CardTitle className="text-xl font-black">Financial Gateway</CardTitle>
                            {stripeEnabled ? (
                                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[9px] uppercase font-black px-2">Enabled</Badge>
                            ) : (
                                <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[9px] uppercase font-black px-2">Action Required</Badge>
                            )}
                        </div>
                        <CardDescription className="text-slate-400">Secure the protocol for automated seller payouts.</CardDescription>
                    </div>
                    <div className="p-3 bg-white/5 rounded-2xl backdrop-blur-md border border-white/10">
                        <Landmark className="h-6 w-6 text-primary" />
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <StatusItem
                        icon={ShieldCheck}
                        title="Secure Ledger"
                        desc="Bank-grade encryption"
                    />
                    <StatusItem
                        icon={Rocket}
                        title="Rapid Payouts"
                        desc="48h processing time"
                    />
                    <StatusItem
                        icon={CreditCard}
                        title="Multiple Rails"
                        desc="ACH, Debit, Wire"
                    />
                </div>

                {stripeEnabled ? (
                    <div className="p-4 bg-white/5 rounded-xl border border-white/10 flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-[10px] uppercase font-black text-slate-500 tracking-widest">Active Account ID</p>
                            <p className="font-mono text-xs text-slate-300">{stripeAccountId}</p>
                        </div>
                        <Button variant="ghost" className="text-xs font-bold text-primary hover:bg-white/5 transition-all">
                            Manage Dashboard
                            <ArrowRight className="ml-2 h-3 w-3" />
                        </Button>
                    </div>
                ) : (
                    <Button
                        size="lg"
                        className="w-full bg-primary text-slate-900 hover:bg-primary/90 font-black rounded-xl h-14 group transition-all"
                        onClick={handleConnect}
                        disabled={isPending}
                    >
                        {isPending ? <Loader2 className="animate-spin" /> : (
                            <>
                                Initialize Stripe Connection
                                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                            </>
                        )}
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}

function StatusItem({ icon: Icon, title, desc }: { icon: any, title: string, desc: string }) {
    return (
        <div className="flex gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-all cursor-default group">
            <div className="p-2 bg-primary/10 rounded-xl group-hover:bg-primary/20 transition-all">
                <Icon className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-0.5">
                <p className="text-sm font-bold text-slate-100">{title}</p>
                <p className="text-[10px] font-medium text-slate-500 uppercase leading-tight">{desc}</p>
            </div>
        </div>
    );
}
