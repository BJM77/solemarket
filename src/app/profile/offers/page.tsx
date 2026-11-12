'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import OfferManager from '@/components/offers/OfferManager';

export default function SellerOffersPage() {
    const { user, isUserLoading } = useUser();
    const router = useRouter();

    useEffect(() => {
        if (!isUserLoading && !user) {
            router.push('/sign-in?redirect=/profile/offers');
        }
    }, [isUserLoading, user, router]);

    if (isUserLoading) {
        return <div className="flex justify-center py-20"><Loader2 className="h-10 w-10 animate-spin text-muted-foreground" /></div>;
    }

    if (!user) return null;

    return (
        <div className="space-y-6">
            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 text-sm" data-testid="offers-moved-note">
                <p className="font-bold">New offers and buy requests now arrive in your orders.</p>
                <p className="text-foreground/80">
                    Accept, decline or counter them in{' '}
                    <Link href="/seller/dashboard?tab=orders" className="font-bold underline">Seller dashboard → Orders → Requests</Link>.
                    Offers you&apos;ve made are in <Link href="/profile/orders" className="font-bold underline">your purchases</Link>.
                    Older offers made before this change are still listed below.
                </p>
            </div>
            <OfferManager />
        </div>
    );
}
