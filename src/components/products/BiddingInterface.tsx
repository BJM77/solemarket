'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Info as InfoIcon, Clock, TrendingUp } from 'lucide-react';
import { Bid, Product, SafeUser } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { placeBidAction } from '@/app/actions/bidding';
import { getCurrentUserIdToken } from '@/lib/firebase/auth';
import { sendActionVerificationEmail, verifyActionCode } from '@/app/actions/email-verification';

interface BiddingInterfaceProps {
    product: Product;
    user: SafeUser;
    onAcceptBid?: (bidId: string) => Promise<void>;
}

export function BiddingInterface({ product, user, onAcceptBid }: BiddingInterfaceProps) {
    const { toast } = useToast();
    const [bidAmount, setBidAmount] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [guestEmail, setGuestEmail] = useState('');
    const [step, setStep] = useState<'amount' | 'verify'>('amount');
    const [loading, setLoading] = useState(false);

    const handleSendVerification = async () => {
        const email = user?.email || guestEmail;
        if (!email) {
            toast({ title: "Email required", description: "Please enter a valid email address.", variant: "destructive" });
            return;
        }

        try {
            setLoading(true);
            const result = await sendActionVerificationEmail(email);
            if (result.success) {
                setStep('verify');
                toast({ title: "Verification Code Sent", description: `Check ${email} for your code.` });
            } else {
                throw new Error(result.error);
            }
        } catch (err: any) {
            toast({ variant: "destructive", title: "Failed to send code", description: err.message });
        } finally {
            setLoading(false);
        }
    };

    const handlePlaceBid = async () => {
        if (!bidAmount) return;

        // --- STEP 1: AMOUNT ---
        if (step === 'amount') {
            if (user) {
                // AUTHENTICATED USERS: Place bid directly
                await executeBidPlacement();
            } else {
                // GUESTS: Transition to verification
                if (!guestEmail || !guestEmail.includes('@')) {
                    toast({ title: "Email required", description: "Please provide an email to verify your bid.", variant: "destructive" });
                    return;
                }
                await handleSendVerification();
            }
            return;
        }

        // --- STEP 2: VERIFY (Guests only) ---
        if (!verificationCode) {
            toast({ title: "Code required", variant: "destructive" });
            return;
        }

        await executeBidPlacement();
    };

    const executeBidPlacement = async () => {
        try {
            setLoading(true);
            const amount = parseFloat(bidAmount);
            const idToken = user ? await getCurrentUserIdToken() : undefined;
            if (user && !idToken) throw new Error("Authentication failed");

            const result = await placeBidAction(
                product.id,
                amount,
                idToken || undefined,
                !user ? guestEmail : undefined,
                !user ? verificationCode : undefined
            );

            if (!result.success) {
                throw new Error(result.error);
            }

            toast({
                title: "Bid Placed",
                description: "Your offer has been sent to the seller!",
            });
            setBidAmount('');
            setVerificationCode('');
            setGuestEmail('');
            setStep('amount');
        } catch (err: any) {
            toast({
                variant: "destructive",
                title: "Action Failed",
                description: err.message,
            });
        } finally {
            setLoading(false);
        }
    };

    const isSeller = user?.uid === product.sellerId;
    const sortedBids = [...(product.bids || [])].sort((a, b) => b.amount - a.amount);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <h3 className="font-black text-xl tracking-tight">Active Offers</h3>
                    <Badge variant="secondary" className="rounded-full px-3">{product.bids?.length || 0}</Badge>
                </div>
                {product.bids && product.bids.length > 0 && (
                    <div className="flex items-center gap-1 text-[10px] font-bold text-orange-500 animate-pulse">
                        <Clock className="h-3 w-3" />
                        <span>LIVE UPDATES</span>
                    </div>
                )}
            </div>

            <div className="space-y-3">
                <AnimatePresence initial={false}>
                    {sortedBids.length > 0 ? (
                        sortedBids.map((bid, index) => (
                            <motion.div
                                key={bid.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ delay: index * 0.05 }}
                                className={`flex justify-between items-center p-4 rounded-2xl border transition-all ${bid.status === 'accepted'
                                    ? 'bg-green-50 border-green-200'
                                    : 'bg-white/50 border-white/60 hover:border-indigo-200 shadow-sm'
                                    }`}
                            >
                                <div className="flex flex-col">
                                    <div className="font-bold flex items-center gap-2 text-sm">
                                        {bid.bidderName}
                                        {bid.bidderId === user?.uid && (
                                            <Badge variant="outline" className="text-[9px] h-4 px-1.5 uppercase font-black bg-indigo-50 text-indigo-600 border-indigo-100">You</Badge>
                                        )}
                                    </div>
                                    <div className="text-[10px] text-muted-foreground font-medium mt-0.5">
                                        {bid.timestamp?.seconds ? new Date(bid.timestamp.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently'}
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="flex flex-col items-end">
                                        <span className="font-black text-lg text-indigo-600">${bid.amount.toLocaleString()}</span>
                                        {index === 0 && bid.status === 'pending' && (
                                            <span className="text-[9px] font-bold text-orange-500 uppercase">Highest Offer</span>
                                        )}
                                    </div>
                                    {isSeller && bid.status === 'pending' && (
                                        <Button
                                            size="sm"
                                            onClick={() => onAcceptBid?.(bid.id)}
                                            className="rounded-full bg-indigo-600 hover:bg-indigo-700 h-8 px-4 text-xs font-bold"
                                        >
                                            Accept
                                        </Button>
                                    )}
                                    {bid.status === 'accepted' && (
                                        <Badge className="bg-green-500 text-white border-none text-[10px] font-black h-6 px-3">ACCEPTED</Badge>
                                    )}
                                </div>
                            </motion.div>
                        ))
                    ) : (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-center p-10 border-2 border-dashed rounded-3xl text-muted-foreground bg-white/20 border-white/40"
                        >
                            <TrendingUp className="h-8 w-8 mx-auto mb-3 opacity-20" />
                            <p className="font-bold text-sm">No offers yet.</p>
                            <p className="text-xs">Be the first to secure this item!</p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {!isSeller && product.status !== 'sold' && (
                <div className="p-6 rounded-3xl bg-indigo-600 shadow-xl shadow-indigo-500/20 text-white relative overflow-hidden">
                    <AnimatePresence mode="wait">
                        {step === 'amount' ? (
                            <motion.div
                                key="amount"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="space-y-4"
                            >
                                <div className="flex items-center gap-2">
                                    <TrendingUp className="h-4 w-4" />
                                    <span className="text-xs font-black uppercase tracking-widest">Place Your Offer</span>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex gap-3">
                                        <div className="relative flex-1">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/60 font-black">$</span>
                                            <Input
                                                type="number"
                                                placeholder="0.00"
                                                className="pl-10 h-14 bg-white/10 border-white/20 text-white placeholder:text-white/40 text-xl font-black rounded-2xl focus-visible:ring-white/30"
                                                value={bidAmount}
                                                onChange={(e) => setBidAmount(e.target.value)}
                                            />
                                        </div>
                                        <Button
                                            onClick={handlePlaceBid}
                                            disabled={loading || !bidAmount}
                                            className="h-14 px-8 bg-white text-indigo-600 hover:bg-white/90 rounded-2xl font-black text-sm transition-transform active:scale-95"
                                        >
                                            {loading ? <Loader2 className="animate-spin w-5 h-5" /> : user ? "SEND OFFER" : "NEXT"}
                                        </Button>
                                    </div>

                                    {!user && (
                                        <div className="relative">
                                            <Input
                                                type="email"
                                                placeholder="Your email address"
                                                className="h-12 bg-white/10 border-white/20 text-white placeholder:text-white/40 font-bold rounded-xl focus-visible:ring-white/30"
                                                value={guestEmail}
                                                onChange={(e) => setGuestEmail(e.target.value)}
                                            />
                                            <p className="text-[9px] font-bold text-white/40 mt-1 uppercase tracking-widest pl-1">Guest verification required</p>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="verify"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="space-y-4"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Clock className="h-4 w-4" />
                                        <span className="text-xs font-black uppercase tracking-widest">Verify Identity</span>
                                    </div>
                                    <button
                                        onClick={() => setStep('amount')}
                                        className="text-[10px] font-black uppercase tracking-widest text-white/60 hover:text-white transition-colors"
                                    >
                                        Go Back
                                    </button>
                                </div>
                                <p className="text-[11px] font-bold text-white/80 leading-snug">
                                    A verification code was sent to <strong>{user?.email || guestEmail}</strong>. Enter it below to confirm your offer.
                                </p>
                                <div className="flex gap-3">
                                    <div className="relative flex-1">
                                        <Input
                                            type="text"
                                            placeholder="•••••"
                                            maxLength={5}
                                            className="h-14 bg-white/10 border-white/20 text-white placeholder:text-white/40 text-xl font-black rounded-2xl focus-visible:ring-white/30 text-center tracking-[8px] uppercase"
                                            value={verificationCode}
                                            onChange={(e) => setVerificationCode(e.target.value.substring(0, 5))}
                                            autoFocus
                                        />
                                    </div>
                                    <Button
                                        onClick={handlePlaceBid}
                                        disabled={loading || verificationCode.length < 5}
                                        className="h-14 px-8 bg-white text-indigo-600 hover:bg-white/90 rounded-2xl font-black text-sm transition-transform active:scale-95"
                                    >
                                        {loading ? <Loader2 className="animate-spin w-5 h-5" /> : "VERIFY & BID"}
                                    </Button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                    <p className="text-[10px] font-bold text-white/50 mt-4 flex items-center gap-1.5 uppercase tracking-tighter">
                        <InfoIcon className="h-3 w-3" />
                        Offers are binding. Seller will be notified immediately.
                    </p>
                </div>
            )}

            {isSeller && (
                <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center gap-3">
                    <div className="bg-indigo-600 p-2 rounded-xl text-white">
                        <InfoIcon className="h-4 w-4" />
                    </div>
                    <div className="text-xs font-bold text-indigo-900 leading-tight">
                        You are the seller. You can accept any offer above to finalize the sale instantly.
                    </div>
                </div>
            )}
        </div>
    );
}
