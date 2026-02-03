'use client';

import React from 'react';
import Image from 'next/image';
import { UserProfile } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, Calendar, ShoppingBag, Star, Award } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SellerStorefrontHeaderProps {
    profile: UserProfile;
}

export function SellerStorefrontHeader({ profile }: SellerStorefrontHeaderProps) {
    return (
        <div className="relative mb-8 bg-card border rounded-2xl overflow-hidden shadow-sm">
            {/* Banner Area */}
            <div className="relative h-48 sm:h-64 bg-slate-100">
                {profile.bannerUrl ? (
                    <Image
                        src={profile.bannerUrl}
                        alt={`${profile.storeName} banner`}
                        fill
                        className="object-cover"
                        priority
                        placeholder="blur"
                        blurDataURL="data:image/webp;base64,UklGRloAAABXRUJQVlA4IE4AAADQAQCdASoIAAgAAUAmJaQAA3AA/v79ggAA"
                    />
                ) : (
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-80" />
                )}
            </div>

            {/* Content Area */}
            <div className="px-6 pb-6 pt-0 relative">
                <div className="flex flex-col sm:flex-row items-end gap-6 -mt-12 sm:-mt-16 mb-4">
                    {/* Avatar */}
                    <div className="relative h-24 w-24 sm:h-32 sm:w-32 rounded-2xl border-4 border-card bg-card overflow-hidden shadow-lg">
                        {profile.photoURL ? (
                            <Image
                                src={profile.photoURL}
                                alt={profile.displayName}
                                fill
                                className="object-cover"
                                placeholder="blur"
                                blurDataURL="data:image/webp;base64,UklGRloAAABXRUJQVlA4IE4AAADQAQCdASoIAAgAAUAmJaQAA3AA/v79ggAA"
                            />
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center bg-muted text-muted-foreground text-3xl font-bold">
                                {profile.displayName?.charAt(0)}
                            </div>
                        )}
                    </div>

                    {/* Core Info */}
                    <div className="flex-1 pb-2">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                                {profile.storeName || profile.displayName}
                            </h1>
                            <div className="flex gap-2">
                                {profile.isVerified && (
                                    <Badge variant="secondary" className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100 border-none flex items-center gap-1">
                                        <ShieldCheck className="h-3 w-3" /> Verified
                                    </Badge>
                                )}
                                {profile.isFounder && (
                                    <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none flex items-center gap-1">
                                        <Award className="h-3 w-3" /> Founder
                                    </Badge>
                                )}
                            </div>
                        </div>
                        <p className="text-muted-foreground line-clamp-2 max-w-2xl text-sm sm:text-base">
                            {profile.storeDescription || profile.bio || "Welcome to my official storefront on Picksy."}
                        </p>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-xl border border-muted-foreground/10">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-background rounded-lg shadow-sm">
                            <Star className="h-4 w-4 text-amber-500" />
                        </div>
                        <div>
                            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider leading-none mb-1">Rating</p>
                            <p className="font-semibold">{profile.rating || 5}.0</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-background rounded-lg shadow-sm">
                            <ShoppingBag className="h-4 w-4 text-emerald-500" />
                        </div>
                        <div>
                            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider leading-none mb-1">Sales</p>
                            <p className="font-semibold">{profile.totalSales || 0}+</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-background rounded-lg shadow-sm">
                            <Calendar className="h-4 w-4 text-indigo-500" />
                        </div>
                        <div>
                            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider leading-none mb-1">Member Since</p>
                            <p className="font-semibold">{profile.joinDate || '2024'}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-background rounded-lg shadow-sm">
                            <Award className="h-4 w-4 text-purple-500" />
                        </div>
                        <div>
                            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider leading-none mb-1">Badge</p>
                            <p className="font-semibold capitalize tracking-tight">{profile.role || 'Seller'}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
