import type { Metadata } from 'next';
import FastBulkClient from '@/components/bulk/FastBulkClient';

export const metadata: Metadata = { title: 'Fast Bulk – list many cards at once', robots: { index: false, follow: false } };

export default function FastBulkPage() {
  return (
    <main className="container mx-auto max-w-6xl px-4 py-6 bg-white">
      <h1 className="text-2xl font-bold mb-1">Fast Bulk</h1>
      <p className="text-sm text-muted-foreground mb-4">Pick hundreds of card photos at once. We pair them front/back, AI fills each listing and saves it as a draft for you to price and publish.</p>
      <FastBulkClient />
    </main>
  );
}
