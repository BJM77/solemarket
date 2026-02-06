'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { Loader2 } from 'lucide-react';
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

    return <OfferManager />;
}
