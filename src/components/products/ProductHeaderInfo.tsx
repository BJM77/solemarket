'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ShieldCheck, TrendingUp, MapPin, Clock, Star, Share2, Heart, MessageSquare, Phone, Tag } from 'lucide-react';
import Link from 'next/link';
import { cn, formatPrice } from '@/lib/utils';
import type { Product, UserProfile } from '@/lib/types';
import { Timestamp } from 'firebase/firestore';
import { calculateDutchAuctionPrice } from '@/lib/pricing';
import { Lock } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ProductHeaderInfoProps {
    product: Product;
    seller: UserProfile | null;
    recentViews?: number;
    className?: string;
    user?: any;
}

export function ProductHeaderInfo({ product, seller, recentViews = 0, className, user }: ProductHeaderInfoProps) {
    const router = useRouter();
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

            <h1 className="text-2xl md:text-3xl font-extrabold leading-tight text-gray-900 dark:text-white flex items-center gap-2.5 flex-wrap">
                {product.title}
                {product.condition && (
                    <Badge variant="outline" className={cn(
                        "text-xs font-bold uppercase tracking-wider px-2.5 py-1 shrink-0",
                        product.condition.toLowerCase().includes('mint') ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        product.condition.toLowerCase().includes('excellent') ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        product.condition.toLowerCase().includes('good') || product.condition.toLowerCase().includes('played') ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        product.condition.toLowerCase().includes('fair') || product.condition.toLowerCase().includes('poor') || product.condition.toLowerCase().includes('damaged') ? 'bg-rose-50 text-rose-700 border-rose-200' :
                        'bg-indigo-50 text-indigo-700 border-indigo-200'
                    )}>
                        {product.condition}
                    </Badge>
                )}
            </h1>

            <div className="flex flex-col gap-3">
                <div className="flex items-center gap-4 flex-wrap">
                    {product.isDutchAuction ? (
                        user ? (
                            <div className="flex flex-col">
                                <span className="text-3xl md:text-4xl font-black text-indigo-600 dark:text-indigo-400">
                                    ${formatPrice(calculateDutchAuctionPrice(
                                        product.price,
                                        product.dutchAuctionDropAmount || 0,
                                        product.dutchAuctionIntervalHours || 1,
                                        product.dutchAuctionFloorPrice || 0,
                                        product.dutchAuctionStartTime || product.createdAt
                                    ))}
                                </span>
                                <span className="text-xs text-indigo-600/70 dark:text-indigo-400/70 font-bold uppercase tracking-wider">
                                    Current Live Price (Dutch Auction)
                                </span>
                            </div>
                        ) : (
                            <Button 
                                onClick={() => router.push(`/sign-in?redirect=/product/${product.id}`)}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-12 rounded-xl shadow-lg shadow-indigo-600/20"
                            >
                                <Lock className="h-4 w-4 mr-2" /> Sign In to View Live Price
                            </Button>
                        )
                    ) : (
                        <span className="text-3xl md:text-4xl font-black text-primary">
                            ${formatPrice(product.price)}
                        </span>
                    )}
                    
                    {product.isNegotiable && !product.isDutchAuction && (
                        <Badge variant="outline" className="text-primary border-primary">Negotiable</Badge>
                    )}
                </div>

                {product.multibuyEnabled && product.multibuyTiers && product.multibuyTiers.length > 0 && (
                    <div className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 mt-1">
                        <div className="flex items-center gap-2 mb-2.5">
                            <Tag className="h-4 w-4 text-indigo-500" />
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                Seller Multibuy Discount
                            </span>
                            {product.multiCardTier && (
                                <span className={cn(
                                    "text-[9px] font-black uppercase px-2 py-0.5 rounded ml-auto border",
                                    product.multiCardTier === 'bronze' ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' :
                                    product.multiCardTier === 'silver' ? 'bg-slate-500/10 text-slate-400 border-slate-500/20' :
                                    product.multiCardTier === 'gold' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
                                    'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                                )}>
                                    {product.multiCardTier}
                                </span>
                            )}
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            {product.multibuyTiers
                                .sort((a, b) => a.minQuantity - b.minQuantity)
                                .map((tier, idx) => (
                                    <div 
                                        key={idx} 
                                        className="bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800/80 rounded-xl p-2 flex flex-col items-center justify-center text-center shadow-sm"
                                    >
                                        <span className="text-[8px] sm:text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Buy {tier.minQuantity}+</span>
                                        <span className="text-xs sm:text-sm font-black text-indigo-600 dark:text-indigo-400 mt-0.5">{tier.discountPercent}% Off</span>
                                    </div>
                                ))
                            }
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-2.5 font-medium leading-relaxed">
                            💡 Mix & match with other eligible items from <b>{product.sellerName || 'this seller'}</b> in <b>{product.category}</b>.
                        </p>
                    </div>
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
