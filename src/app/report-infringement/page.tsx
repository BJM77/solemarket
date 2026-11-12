
import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/layout/PageHeader';
import { TakedownForm } from '@/components/legal/TakedownForm';

export const metadata: Metadata = {
  title: 'Report infringement',
  description: 'Report a counterfeit, trademark or copyright issue on a Benched listing.',
  alternates: { canonical: '/report-infringement' },
};

export default function ReportInfringementPage() {
  return (
    <div className="container py-12 md:py-16 max-w-3xl">
      <PageHeader
        title="Report infringement"
        description="For rights holders: tell us about a listing that may be counterfeit or may infringe a trademark or copyright."
      />
      <p className="text-sm text-muted-foreground mb-8">
        We review reports and may remove a listing, end an account, or block a mobile number. We do not send an automated email confirmation.
        Copyright process notes are also in our <Link href="/dmca" className="underline">DMCA policy</Link>.
      </p>
      <div className="relative">
        <Suspense fallback={<div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">Loading form…</div>}>
          <TakedownForm />
        </Suspense>
      </div>
    </div>
  );
}
