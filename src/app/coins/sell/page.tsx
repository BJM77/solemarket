import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { CoinListingForm } from '@/components/coins/CoinListingForm';
import { coinsPageMetadata } from '@/lib/coins/seo';

export const metadata = coinsPageMetadata({
  title: 'Sell coins & bullion',
  description: 'List coins, bullion and banknotes on Benched Coins. Buyers pay you directly by PayID or cash on pickup.',
  path: '/sell',
  noindex: true,
});

export default function CoinsSellPage() {
  return (
    <div className="container mx-auto px-4 py-10">
      <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-amber-600" /></div>}>
        <CoinListingForm />
      </Suspense>
    </div>
  );
}
