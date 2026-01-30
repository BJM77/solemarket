
'use client';

import { useState, useTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Zap, Shield, Crown, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { upgradePlanAction } from '@/app/actions/billing';
import { getCurrentUserIdToken } from '@/lib/firebase/auth';

export function SubscriptionTier({ currentPlan = 'base' }: { currentPlan?: string }) {
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();

    const handleUpgrade = () => {
        startTransition(async () => {
            const idToken = await getCurrentUserIdToken();
            if (!idToken) return;

            const result = await upgradePlanAction(idToken);
            if (result.success) {
                toast({ title: "Success!", description: result.message });
                window.location.reload();
            } else {
                toast({ title: "Error", description: result.message, variant: "destructive" });
            }
        });
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className={cn(
                "relative overflow-hidden border-2 transition-all duration-300",
                currentPlan === 'base' ? "border-slate-900 shadow-xl scale-105 z-10" : "border-slate-100 opacity-80"
            )}>
                {currentPlan === 'base' && (
                    <div className="absolute top-0 right-0 bg-slate-900 text-white text-[10px] font-black px-4 py-1 uppercase tracking-widest rounded-bl-xl">
                        Active Plan
                    </div>
                )}
                <CardHeader className="pb-8">
                    <CardTitle className="text-2xl font-black">Standard Agent</CardTitle>
                    <div className="flex items-baseline gap-1 mt-2">
                        <span className="text-4xl font-black">$0</span>
                        <span className="text-slate-400 font-bold uppercase text-xs">/ month</span>
                    </div>
                    <CardDescription className="mt-4 font-semibold text-slate-500">
                        Essential tools for casual collectors and start-up sellers.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <FeatureItem text="40 Allocated Listings" />
                    <FeatureItem text="Standard Marketplace Access" />
                    <FeatureItem text="Network Messaging" />
                    <FeatureItem text="Basic Fulfillment Tracking" />
                    <FeatureItem text="10% Standard Platform Fee" />
                </CardContent>
                <CardFooter>
                    <Button variant="outline" className="w-full h-12 font-bold rounded-xl" disabled={currentPlan === 'base'}>
                        {currentPlan === 'base' ? "Current Capability" : "Downgrade"}
                    </Button>
                </CardFooter>
            </Card>

            <Card className={cn(
                "relative overflow-hidden border-2 transition-all duration-300 bg-slate-900 text-white",
                currentPlan === 'pro' ? "border-primary shadow-xl scale-105 z-10" : "border-transparent shadow-lg"
            )}>
                {currentPlan === 'pro' ? (
                    <div className="absolute top-0 right-0 bg-primary text-slate-900 text-[10px] font-black px-4 py-1 uppercase tracking-widest rounded-bl-xl">
                        Active Pro
                    </div>
                ) : (
                    <div className="absolute top-0 right-0 bg-gradient-to-r from-amber-400 to-amber-600 text-slate-900 text-[10px] font-black px-4 py-1 uppercase tracking-widest rounded-bl-xl">
                        Recommended
                    </div>
                )}
                <CardHeader className="pb-8">
                    <CardTitle className="text-2xl font-black flex items-center gap-2">
                        <Crown className="h-6 w-6 text-amber-400" />
                        Elite Syndicate
                    </CardTitle>
                    <div className="flex items-baseline gap-1 mt-2">
                        <span className="text-4xl font-black">$20</span>
                        <span className="text-slate-400 font-bold uppercase text-xs">/ month</span>
                    </div>
                    <CardDescription className="mt-4 font-semibold text-slate-300">
                        High-volume operational features for professional merchants.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <FeatureItem text="1,000 Allocated Listings" active />
                    <FeatureItem text="Priority Marketplace Placement" active />
                    <FeatureItem text="Advanced Analytics Suite" active />
                    <FeatureItem text="Bulk Inventory Sync" active />
                    <FeatureItem text="Priority Conflict Support" active />
                    <FeatureItem text="Reduced 5% Platform Fee" active />
                </CardContent>
                <CardFooter>
                    <Button
                        className={cn(
                            "w-full h-12 font-black rounded-xl transition-all duration-300",
                            currentPlan === 'pro'
                                ? "bg-slate-800 text-slate-400"
                                : "bg-gradient-to-r from-amber-400 to-amber-600 text-slate-900 hover:scale-105"
                        )}
                        onClick={handleUpgrade}
                        disabled={isPending || currentPlan === 'pro'}
                    >
                        {isPending ? <Loader2 className="animate-spin" /> : (currentPlan === 'pro' ? "Active Capability" : "Authorize Upgrade")}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}

function FeatureItem({ text, active = false }: { text: string, active?: boolean }) {
    return (
        <div className="flex items-center gap-3">
            <div className={cn(
                "rounded-full p-0.5",
                active ? "bg-amber-400/20 text-amber-400" : "bg-emerald-100 text-emerald-600"
            )}>
                <Check className="h-3.5 w-3.5" />
            </div>
            <span className={cn(
                "text-sm font-bold",
                active ? "text-slate-200" : "text-slate-600"
            )}>{text}</span>
        </div>
    );
}

function cn(...inputs: any[]) {
    return inputs.filter(Boolean).join(' ');
}
