import type { Metadata } from 'next';
import Link from 'next/link';
import { PriceCheckTool } from '@/components/price-check/PriceCheckTool';

export const metadata: Metadata = { title: 'Price Check', robots: { index: false, follow: false } };

export default function SellerPriceCheckPage() {
    return (
        <div className="container mx-auto max-w-4xl px-4 py-8 pb-32 space-y-4">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground"><Link href="/seller/dashboard" className="underline">Seller dashboard</Link></p>
            <h1 className="text-3xl font-black tracking-tight">Price Check</h1>
            <p className="text-sm text-muted-foreground">See what similar items sell for before you list, so you don&apos;t under-price.</p>
            <PriceCheckTool />
        </div>
    );
}
