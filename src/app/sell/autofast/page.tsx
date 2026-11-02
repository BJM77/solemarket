import type { Metadata } from 'next';
import AutofastClient from '@/components/bulk/AutofastClient';

export const metadata: Metadata = { title: 'Autofast – rapid card scanning', robots: { index: false, follow: false } };

export default function AutofastPage() {
  return (
    <main className="container mx-auto max-w-3xl px-4 py-6 bg-white">
      <h1 className="text-2xl font-bold mb-1">Autofast</h1>
      <p className="text-sm text-muted-foreground mb-4">Scan the front, flip, scan the back. Each card saves as a draft automatically and the camera moves on to the next one. AI fills the details in the background.</p>
      <AutofastClient />
    </main>
  );
}
