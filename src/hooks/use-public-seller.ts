'use client';

import { useEffect, useState } from 'react';
import { getPublicSellerInfo } from '@/app/actions/seller/public-seller';
import type { UserProfile } from '@/lib/types';

/** Public seller info via the server — never reads the private users/{uid} doc client-side. */
export function usePublicSeller(sellerId?: string | null, initial?: UserProfile | null) {
    const [data, setData] = useState<UserProfile | null>(initial ?? null);
    const [isLoading, setIsLoading] = useState<boolean>(!initial && !!sellerId);

    useEffect(() => {
        if (!sellerId) { setData(null); setIsLoading(false); return; }
        if (initial && (initial as any).id === sellerId) { setData(initial); setIsLoading(false); return; }
        let cancelled = false;
        setIsLoading(true);
        getPublicSellerInfo(sellerId)
            .then((p) => { if (!cancelled) setData(p); })
            .catch(() => { if (!cancelled) setData(null); })
            .finally(() => { if (!cancelled) setIsLoading(false); });
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sellerId]);

    return { data, isLoading };
}
