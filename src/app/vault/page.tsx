import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Benched Vault',
  description: 'Benched Vault is not currently offered. Benched does not physically authenticate or store items.',
  alternates: { canonical: '/vault' },
};

export default function VaultPage() {
  return (
    <div className="bg-background min-h-screen pb-20">
      <PageHeader
        title="Benched Vault"
        description="This service is not currently offered."
      />
      <div className="container mx-auto px-4 mt-12 max-w-3xl space-y-6">
        <p className="text-lg text-muted-foreground leading-relaxed">
          Benched Vault is not available. We do not physically inspect, authenticate or store items, and we do not hold payments.
          Benched is a peer-to-peer marketplace: buyers pay sellers directly by PayID or cash on pickup in Perth.
        </p>
        <p className="text-lg text-muted-foreground leading-relaxed">
          For how authenticity and reports work today, see{' '}
          <Link href="/authenticity" className="underline font-semibold text-foreground">Authenticity and integrity</Link>
          {' '}and our <Link href="/terms" className="underline font-semibold text-foreground">Terms of Service</Link>.
        </p>
        <Button asChild>
          <Link href="/browse">Browse the marketplace</Link>
        </Button>
      </div>
    </div>
  );
}
