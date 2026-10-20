import type { Metadata } from 'next';
import { TierBulkAssign } from '@/components/multibuy/TierBulkAssign';

export const metadata: Metadata = { title: 'Bundle tiers', robots: { index: false } };

export default function SellerBundleTiersPage() {
    return (
        <div className="container mx-auto px-4 py-8 pt-20 space-y-4 max-w-4xl">
            <h1 className="text-2xl font-black">Bronze, Silver &amp; Gold bundles</h1>
            <p className="text-sm text-muted-foreground">
                Put your cards and coins into a tier so buyers get a fixed bundle price when they buy a full set from you. Card tiers only count cards and coin tiers only count coins.
            </p>
            <TierBulkAssign scope="mine" />
        </div>
    );
}
