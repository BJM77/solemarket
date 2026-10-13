import type { Metadata } from 'next';
import SellerBundlesClient from './SellerBundlesClient';

export const metadata: Metadata = {
    title: 'Bundles',
    robots: { index: false, follow: false },
};

export default function SellerBundlesPage() {
    return <SellerBundlesClient />;
}
