'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ShieldCheck, TrendingUp, MapPin, Clock, Star, Share2, Heart, MessageSquare, Phone } from 'lucide-react';
import Link from 'next/link';
import { cn, formatPrice } from '@/lib/utils';
import type { Product, UserProfile } from '@/lib/types';
import { Timestamp } from 'firebase/firestore';

interface ProductHeaderInfoProps {
    product: Product;
    seller: UserProfile | null;
    recentViews?: number;
    className?: string;
}

export function ProductHeaderInfo({ product, seller, recentViews = 0, className }: ProductHeaderInfoProps) {
    const getRelativeTime = (date: any) => {
        if (!date) return '';
        const d = date.toDate ? date.toDate() : new Date(date);
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000);

        if (diffInSeconds < 60) return `Just now`;
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} mins ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
        return `${Math.floor(diffInSeconds / 86400)} days ago`;
    };

    return (
        <div className={cn("space-y-4", className)}>
            {/* Seller Badge & Social Proof */}
            <div className="flex flex-wrap items-center gap-3">
                {seller?.isVerified && (
                    <div className="flex items-center gap-2">
                        <ShieldCheck className="text-primary h-5 w-5 fill-primary/10" />
                        <span className="text-xs font-bold text-primary uppercase tracking-widest">Verified Seller</span>
                    </div>
                )}
                {recentViews > 5 && (
                    <div className="flex items-center gap-2 bg-orange-50 dark:bg-orange-950/30 px-3 py-1 rounded-full border border-orange-100 dark:border-orange-900/50 animation-pulse-subtle">
                        <TrendingUp className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
                        <span className="text-xs font-bold text-orange-700 dark:text-orange-300">
                            {recentViews} people viewed this
                        </span>
                    </div>
                )}
            </div>

            <h1 className="text-2xl md:text-3xl font-extrabold leading-tight text-gray-900 dark:text-white">
                {product.title}
            </h1>

            <div className="flex items-center gap-4 flex-wrap">
                <span className="text-3xl md:text-4xl font-black text-primary">
                    ${formatPrice(product.price)}
                </span>
                {product.multiCardTier === 'bronze' && <span className="bg-orange-100 text-orange-800 border border-orange-200 text-[10px] px-2 py-1 rounded font-black uppercase tracking-tighter shadow-sm shrink-0">Bronze Deal</span>}
                {product.multiCardTier === 'silver' && <span className="bg-slate-200 text-slate-700 border border-slate-300 text-[10px] px-2 py-1 rounded font-black uppercase tracking-tighter shadow-sm shrink-0">Silver Deal</span>}
                {product.multiCardTier === 'gold' && <span className="bg-yellow-100 text-yellow-800 border border-yellow-300 text-[10px] px-2 py-1 rounded font-black uppercase tracking-tighter shadow-sm shrink-0">Gold Deal</span>}
                {product.multiCardTier === 'platinum' && <span className="bg-indigo-100 text-indigo-800 border border-indigo-300 text-[10px] px-2 py-1 rounded font-black uppercase tracking-tighter shadow-sm shrink-0">Platinum Deal</span>}
                {product.isNegotiable && (
                    <Badge variant="outline" className="text-primary border-primary">Negotiable</Badge>
                )}
            </div>

            <div className="flex items-center gap-2 text-gray-500 text-sm pb-4 border-b border-gray-100 dark:border-gray-700">
                <MapPin className="h-4 w-4" />
                <span>Australia</span>
                <span className="mx-2">•</span>
                <Clock className="h-4 w-4" />
                <span>Posted {getRelativeTime(product.createdAt)}</span>
            </div>
        </div>
    );
}
