'use client';

import React, { useState, useEffect } from 'react';
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
import { sendActionVerificationEmail, verifyActionCode } from '@/app/actions/email-verification';
import { trackEcommerceEvent } from '@/lib/analytics';

interface OfferModalProps {
    product: Product;
    user: SafeUser | null;
    trigger?: React.ReactNode;
}

export function OfferModal({ product, user, trigger }: OfferModalProps) {
    const [offerAmount, setOfferAmount] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [guestEmail, setGuestEmail] = useState('');
    const [pendingPaymentMethodId, setPendingPaymentMethodId] = useState<string | undefined>(undefined);
    const [step, setStep] = useState<'amount' | 'verify'>('amount');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const router = useRouter();
    const { toast } = useToast();

    // Load persisted guest data
    useEffect(() => {
        if (!user && isOpen) {
            const savedEmail = localStorage.getItem('guest_email');
            const savedCode = localStorage.getItem('guest_code');
            if (savedEmail) setGuestEmail(savedEmail);
            if (savedCode) {
                setVerificationCode(savedCode);
                // If we have both email and code, we can skip the send step
                // but let's keep them at verified state for transparency
                setStep('verify');
            }
        }
    }, [user, isOpen]);

    const handleSendVerification = async () => {
        const email = user?.email || guestEmail;
        if (!email) {
            toast({ title: "Email required", description: "Please enter a valid email address.", variant: "destructive" });
            return;
        }

        setIsSubmitting(true);
        try {
            const result = await sendActionVerificationEmail(email);
            if (result.success) {
                setStep('verify');
                toast({ title: "Verification Code Sent", description: `A code has been sent to ${email}` });
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast({ title: "Failed to send code", description: error.message, variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePlaceOffer = async () => {
        const amount = parseFloat(offerAmount);
        if (isNaN(amount) || amount <= 0) {
            toast({ title: "Invalid amount", variant: "destructive" });
            return;
        }

        // --- STEP 1: AMOUNT ---
        if (step === 'amount') {
            if (user) {
                // AUTHENTICATED USERS: Check for exemption
                const role = (user as any).role;
                const isExempt = ['admin', 'superadmin', 'buyer', 'seller'].includes(role) || user.emailVerified;

                if (isExempt) {
                    // Place bid directly
                    await executeBidPlacement(amount);
                } else {
                    // Force verification for role-less/unverified accounts
                    await handleSendVerification();
                }
            } else {
                // GUESTS: Transition to verification step
                if (!guestEmail || !guestEmail.includes('@')) {
                    toast({ title: "Email required", description: "Guests must provide an email to verify their offer.", variant: "destructive" });
                    return;
                }
                await handleSendVerification();
            }
            return;
        }

        // --- STEP 2: VERIFY (Guests and Unverified Users) ---
        if (!verificationCode) {
            toast({ title: "Enter verification code", variant: "destructive" });
            return;
        }

        await executeBidPlacement(amount);
    };

    const executeBidPlacement = async (amount: number) => {
        setIsSubmitting(true);
        try {
            const idToken = user ? await getCurrentUserIdToken() : undefined;
            if (user && !idToken) throw new Error("Authentication failed");

            // Call the updated placeBidAction (without payment method)
            const result = await placeBidAction(
                product.id,
                amount,
                idToken || undefined,
                !user ? guestEmail : undefined,
                !user ? verificationCode : undefined
            );

            if (result.success) {
                // Persist successful guest verification
                if (!user) {
                    localStorage.setItem('guest_email', guestEmail);
                    localStorage.setItem('guest_code', verificationCode);
                }

                // Track lead generation
                trackEcommerceEvent.generateLead(product, 'offer');

                toast({
                    title: "Offer Sent!",
                    description: `Your binding offer of $${amount.toLocaleString()} has been sent.`,
                });
                setIsOpen(false);
                setOfferAmount('');
                setVerificationCode(verificationCode); // Keep code for session
                setPendingPaymentMethodId(undefined);
                setStep(user ? 'amount' : 'verify'); // Stay at verify for guests
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast({
                title: "Action Failed",
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
                    <DialogTitle className="text-2xl font-black text-gray-900">
                        {step === 'verify' ? "Verify Identity" : `Make an Offer`}
                    </DialogTitle>
                    <DialogDescription className="text-gray-500">
                        {step === 'verify' 
                            ? "Enter the code sent to your email to verify your identity." 
                            : `Enter your offer for ${product.title}.`}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    {step === 'amount' ? (
                        <>
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

                            {!user && (
                                <div className="grid gap-2">
                                    <Label htmlFor="guestEmail">Your Email Address</Label>
                                    <Input
                                        id="guestEmail"
                                        type="email"
                                        placeholder="you@example.com"
                                        value={guestEmail}
                                        onChange={(e) => setGuestEmail(e.target.value)}
                                    />
                                    <p className="text-[10px] text-muted-foreground">
                                        As a guest, you'll need to verify this email before placing an offer.
                                    </p>
                                </div>
                            )}

                            {isValidAmount && isUntimed && (
                                <div className="pt-2 border-t">
                                    <div className="bg-indigo-50 p-4 rounded-xl text-indigo-800 text-xs font-bold text-center border border-indigo-100">
                                        Offers are non-binding expressions of interest. You can negotiate terms with the seller after submitting.
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="space-y-4">
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
                                <p className="text-amber-800 font-bold mb-1">Verify Your Offer</p>
                                <p className="text-amber-700 text-xs text-balance">
                                    A 5-digit code was sent to <strong>{user?.email || guestEmail}</strong>. Entering this code will confirm your binding offer of <strong>${amountNum.toLocaleString()}</strong>.
                                </p>
                            </div>
                            <div className="grid gap-2 text-center">
                                <Label htmlFor="code" className="text-xs uppercase tracking-widest text-muted-foreground">Enter Code</Label>
                                <Input
                                    id="code"
                                    placeholder="•••••"
                                    className="text-center text-3xl font-black h-16 tracking-[10px] uppercase"
                                    value={verificationCode}
                                    onChange={(e) => setVerificationCode(e.target.value.substring(0, 5))}
                                    maxLength={5}
                                    autoFocus
                                />
                                <button
                                    className="text-[10px] text-indigo-600 font-bold uppercase mt-1 hover:underline disabled:opacity-50"
                                    onClick={handleSendVerification}
                                    disabled={isSubmitting}
                                >
                                    Resend Code
                                </button>
                            </div>
                        </div>
                    )}

                    {!isUntimed && (
                        <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-lg">
                            <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 font-bold mb-1">
                                <ShieldCheck className="h-4 w-4" />
                                <span className="text-xs uppercase tracking-wider">Expression of Interest</span>
                            </div>
                            <p className="text-[11px] text-indigo-600 dark:text-indigo-400 leading-tight">
                                By submitting, you are notifying the seller of your interest at this price. This is not a binding purchase.
                            </p>
                        </div>
                    )}
                </div>

                {!isUntimed && (
                    <DialogFooter>
                        <Button
                            variant="ghost"
                            onClick={() => step === 'amount' ? setIsOpen(false) : setStep('amount')}
                            disabled={isSubmitting}
                        >
                            {step === 'amount' ? 'Cancel' : 'Back'}
                        </Button>
                        <Button
                            className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 px-8 shadow-lg shadow-indigo-100"
                            onClick={() => handlePlaceOffer()}
                            disabled={isSubmitting || (step === 'amount' && !isValidAmount) || (step === 'verify' && verificationCode.length < 5)}
                        >
                            {isSubmitting ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (step === 'amount' && !user) ? (
                                "Next: Verify Identity"
                            ) : (
                                "Confirm Bid & Offer"
                            )}
                        </Button>
                    </DialogFooter>
                )}
            </DialogContent>
        </Dialog>
    );
}
