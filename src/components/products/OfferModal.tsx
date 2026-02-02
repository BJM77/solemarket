'use client';

import React, { useState } from 'react';
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

interface OfferModalProps {
    product: Product;
    user: SafeUser;
    trigger?: React.ReactNode;
}

export function OfferModal({ product, user, trigger }: OfferModalProps) {
    const [offerAmount, setOfferAmount] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const { toast } = useToast();

    const handlePlaceOffer = async () => {
        if (!user) {
            toast({ title: "Please sign in", description: "You must be logged in to make an offer." });
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

            // For now, we use the same placeBidAction, but we might want to flag it as a binding offer
            const result = await placeBidAction(product.id, idToken, amount);

            if (result.success) {
                toast({
                    title: "Offer Sent!",
                    description: `Your offer of $${amount.toLocaleString()} has been sent to the seller.`,
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

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="outline" className="w-full gap-2 border-indigo-200 hover:bg-indigo-50 text-indigo-700">
                        Make an Offer
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Make an Offer</DialogTitle>
                    <DialogDescription>
                        You are making an offer for "{product.title}".
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg text-sm text-blue-700 dark:text-blue-300">
                        <Info className="h-4 w-4 shrink-0" />
                        <p>Asking Price: <strong>${product.price.toLocaleString()}</strong></p>
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

                    <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-lg">
                        <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-bold mb-1">
                            <ShieldCheck className="h-4 w-4" />
                            <span className="text-xs uppercase tracking-wider">Binding Offer</span>
                        </div>
                        <p className="text-[11px] text-emerald-600 dark:text-emerald-400 leading-tight">
                            By submitting, you agree to purchase this item if the seller accepts your offer within 48 hours.
                        </p>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={() => setIsOpen(false)} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button
                        className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
                        onClick={handlePlaceOffer}
                        disabled={isSubmitting}
                    >
                        {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                        Submit Offer
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
