'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Product, Bid, SafeUser } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from '@/hooks/use-toast';
import { Loader2, ShieldCheck, Info } from 'lucide-react';
import { placeBidAction } from '@/app/actions/bidding';
import { getCurrentUserIdToken } from '@/lib/firebase/auth';
import { BidsyOfferForm } from '@/components/payment/BidsyOfferForm';

interface OfferModalProps {
    product: Product;
    user: SafeUser | null;
    trigger?: React.ReactNode;
}

export function OfferModal({ product, user, trigger }: OfferModalProps) {
    const [offerAmount, setOfferAmount] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const router = useRouter();
    const { toast } = useToast();

    const handlePlaceOffer = async (paymentMethodId?: string) => {
        if (!user) {
            toast({
                title: "Sign in required",
                description: "Creating an account is free and only takes a minute!"
            });
            router.push(`/sign-in?redirect=/product/${product.id}`);
            return;
        }

        if (user.role !== 'admin' && user.role !== 'superadmin' && !user.isVerified) {
            toast({
                title: "Verification Required",
                description: "You must verify your identity before making offers.",
                variant: "destructive"
            });
            router.push('/verify');
            return;
        }

        const amount = parseFloat(offerAmount);
        if (isNaN(amount) || amount <= 0) {
            toast({ title: "Invalid amount", variant: "destructive" });
            return;
        }

        setIsSubmitting(true);
        try {
            const idToken = await getCurrentUserIdToken();
            if (!idToken) throw new Error("Authentication failed");

            const result = await placeBidAction(product.id, idToken, amount, paymentMethodId);

            if (result.success) {
                toast({
                    title: "Offer Sent!",
                    description: `Your binding offer of $${amount.toLocaleString()} has been sent.`,
                });
                setIsOpen(false);
                setOfferAmount('');
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast({
                title: "Offer Failed",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const isUntimed = product.isUntimed;
    const amountNum = parseFloat(offerAmount);
    const isValidAmount = !isNaN(amountNum) && amountNum > 0;

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="outline" className="w-full gap-2 border-indigo-200 hover:bg-indigo-50 text-indigo-700">
                        Make an Offer
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] overflow-y-auto max-h-[90vh]">
                <DialogHeader>
                    <DialogTitle>Make an Offer</DialogTitle>
                    <DialogDescription>
                        You are making an offer for "{product.title}".
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg text-sm text-blue-700 dark:text-blue-300">
                            <Info className="h-4 w-4 shrink-0" />
                            {isUntimed ? (
                                <p>This item is mainly open to offers. Please submit your best offer.</p>
                            ) : (
                                <p>Asking Price: <strong>${product.price.toLocaleString()}</strong></p>
                            )}
                        </div>

                        {(() => {
                            const rejectedBids = product.bids?.filter(b => b.status === 'rejected') || [];
                            if (rejectedBids.length > 0) {
                                const highestRejected = Math.max(...rejectedBids.map(b => b.amount));
                                return (
                                    <div className="flex items-center gap-3 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800 rounded-lg text-sm text-orange-700 dark:text-orange-300">
                                        <Info className="h-4 w-4 shrink-0" />
                                        <p>Highest rejected offer: <strong>${highestRejected.toLocaleString()}</strong></p>
                                    </div>
                                );
                            }
                            return null;
                        })()}
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="offer">Your Offer Amount</Label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                            <Input
                                id="offer"
                                type="number"
                                placeholder="0.00"
                                className="pl-7"
                                value={offerAmount}
                                onChange={(e) => setOfferAmount(e.target.value)}
                                autoFocus
                            />
                        </div>
                    </div>

                    {isValidAmount && isUntimed && (
                        <div className="pt-2 border-t">
                            <Label className="mb-2 block">Payment Method (Binding Offer)</Label>
                            <BidsyOfferForm
                                offerAmount={amountNum}
                                onOfferSubmit={(pmId) => handlePlaceOffer(pmId)}
                            />
                        </div>
                    )}

                    {!isUntimed && (
                        <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-lg">
                            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-bold mb-1">
                                <ShieldCheck className="h-4 w-4" />
                                <span className="text-xs uppercase tracking-wider">Binding Offer</span>
                            </div>
                            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 leading-tight">
                                By submitting, you agree to purchase this item if the seller accepts your offer within 48 hours.
                            </p>
                        </div>
                    )}
                </div>

                {!isUntimed && (
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsOpen(false)} disabled={isSubmitting}>
                            Cancel
                        </Button>
                        <Button
                            className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
                            onClick={() => handlePlaceOffer()}
                            disabled={isSubmitting}
                        >
                            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                            Submit Offer
                        </Button>
                    </DialogFooter>
                )}
            </DialogContent>
        </Dialog>
    );
}
