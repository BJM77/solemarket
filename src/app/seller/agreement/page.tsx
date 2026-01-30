
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirebase, useDoc, useMemoFirebase } from '@/firebase';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { ShieldCheck, CheckCircle2, ChevronRight, Loader2 } from 'lucide-react';

export default function SellerAgreementPage() {
    const router = useRouter();
    const { user, isUserLoading } = useUser();
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [accepted, setAccepted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const userRef = useMemoFirebase(() => user ? doc(firestore!, 'users', user.uid) : null, [user, firestore]);
    const { data: userProfile, isLoading: profileLoading } = useDoc<any>(userRef);

    useEffect(() => {
        if (!isUserLoading && !user) {
            router.push('/sign-in?redirect=/seller/agreement');
        }
        if (userProfile?.sellerStatus === 'pending') {
            router.push('/seller/dashboard');
        }
        if (userProfile?.canSell) {
            router.push('/seller/dashboard');
        }
    }, [user, isUserLoading, userProfile, router]);

    const handleAccept = async () => {
        if (!accepted || !user || !firestore) return;

        setIsSubmitting(true);
        try {
            await updateDoc(doc(firestore, 'users', user.uid), {
                sellerStatus: 'pending',
                agreementAccepted: true,
                agreementAcceptedAt: Timestamp.now(),
                listingLimit: 40, // Base limit
            });

            toast({
                title: "Application Submitted",
                description: "Your seller application is now pending admin approval.",
            });

            router.push('/seller/dashboard');
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isUserLoading || profileLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-full mb-4">
                        <ShieldCheck className="h-10 w-10 text-primary" />
                    </div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight">Seller Agreement</h1>
                    <p className="mt-4 text-lg text-slate-500">Join the Picksy marketplace and start selling your collectibles.</p>
                </div>

                <Card className="border-none shadow-xl">
                    <CardHeader className="bg-slate-900 text-white rounded-t-xl py-8">
                        <CardTitle className="text-2xl">Terms of Service for Sellers</CardTitle>
                        <CardDescription className="text-slate-300">Please read carefully before proceeding.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-8 space-y-6">
                        <div className="space-y-4 text-slate-600">
                            <section className="space-y-2">
                                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                                    <CheckCircle2 className="h-5 w-5 text-primary" />
                                    1. Admin Approval
                                </h3>
                                <p>All new sellers must be reviewed and approved by the Picksy Super Admin team before being allowed to list items for sale. This process usually takes 24-48 hours.</p>
                            </section>

                            <section className="space-y-2">
                                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                                    <CheckCircle2 className="h-5 w-5 text-primary" />
                                    2. Listing Limits
                                </h3>
                                <p>Approved sellers start with a base limit of <strong>40 active listings</strong>. If you reach this limit, you can upgrade your plan for <strong>$20/month</strong> to gain an additional 40 listings.</p>
                            </section>

                            <section className="space-y-2">
                                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                                    <CheckCircle2 className="h-5 w-5 text-primary" />
                                    3. Authenticity Guarantee
                                </h3>
                                <p>Sellers agree to only list items that they physically possess and guarantee the authenticity of all items. Misrepresentation or selling counterfeit items will lead to immediate account termination.</p>
                            </section>

                            <section className="space-y-2">
                                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                                    <CheckCircle2 className="h-5 w-5 text-primary" />
                                    4. Fees & Payments
                                </h3>
                                <p>Picksy collects a platform fee on every successful sale. Detailed fee structures are available in the Seller Help Center. Payments are processed securely via our payment partners.</p>
                            </section>
                        </div>

                        <div className="pt-6 border-t border-slate-100">
                            <div className="flex items-start space-x-3">
                                <Checkbox
                                    id="terms"
                                    checked={accepted}
                                    onCheckedChange={(checked) => setAccepted(checked as boolean)}
                                    className="mt-1"
                                />
                                <div className="grid gap-1.5 leading-none">
                                    <label
                                        htmlFor="terms"
                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-slate-700"
                                    >
                                        I have read and agree to the Picksy Seller Agreement and Marketplace Terms of Service.
                                    </label>
                                    <p className="text-xs text-slate-500">
                                        By checking this box, you are applying to become a seller on Picksy.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="bg-slate-50 p-8 rounded-b-xl flex flex-col sm:flex-row gap-4 justify-between items-center">
                        <Button variant="ghost" onClick={() => router.back()}>Cancel</Button>
                        <Button
                            size="lg"
                            className="w-full sm:w-auto font-bold px-10 relative overflow-hidden group"
                            disabled={!accepted || isSubmitting}
                            onClick={handleAccept}
                        >
                            {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                                <>
                                    Apply Now
                                    <ChevronRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                                </>
                            )}
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}
