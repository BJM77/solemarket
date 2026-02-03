import React from 'react';
import { notFound } from 'next/navigation';
import { getSellerProfile } from '@/app/actions/seller';
import { SellerStorefrontHeader } from '@/components/shop/SellerStorefrontHeader';
import InfiniteProductGrid from '@/components/products/InfiniteProductGrid';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';

interface ShopPageProps {
    params: {
        id: string;
    };
}

export async function generateMetadata({ params }: ShopPageProps): Promise<Metadata> {
    const { id } = await params;
    const { profile } = await getSellerProfile(id);

    if (!profile) {
        return {
            title: 'Shop Not Found | Picksy',
        };
    }

    const name = profile.storeName || profile.displayName;
    return {
        title: `${name}'s Storefront | Picksy`,
        description: profile.storeDescription || `Browse the latest collection from ${name} on Picksy Australia.`,
        openGraph: {
            images: profile.bannerUrl ? [profile.bannerUrl] : [],
        }
    };
}

export default async function ShopPage({ params }: ShopPageProps) {
    const { id } = await params;
    const { profile, error } = await getSellerProfile(id);

    if (error || !profile) {
        notFound();
    }

    // Redirect to slug-based URL if a slug exists and the current path uses the ID
    if (profile.shopSlug && id === profile.id) {
        redirect(`/shop/${profile.shopSlug}`);
    }

    return (
        <div className="min-h-screen bg-slate-50/50">
            <div className="container mx-auto px-4 py-8">
                <SellerStorefrontHeader profile={profile} />

                <div className="mt-12">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="text-2xl font-bold tracking-tight">Store Listings</h2>
                            <p className="text-muted-foreground text-sm">
                                Showing all items available from {profile.storeName || profile.displayName}.
                            </p>
                        </div>
                    </div>

                    <InfiniteProductGrid
                        pageTitle=""
                        initialFilterState={{ sellers: [id] }}
                    />
                </div>
            </div>
        </div>
    );
}
