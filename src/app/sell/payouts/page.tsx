import type { Metadata } from 'next';
import Link from 'next/link';
import { PayIdSettings } from '@/components/seller/PayIdSettings';

export const metadata: Metadata = { title: 'Get paid', robots: { index: false, follow: false } };

export default function PayoutsPage() {
    return (
        <div className="mx-auto max-w-xl px-4 py-8 pb-32">
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground"><Link href="/sell/onboarding" className="underline">Seller setup</Link></p>
            <h1 className="mb-4 text-3xl font-black tracking-tight">Get paid</h1>
            <PayIdSettings />
            <p className="mt-6 text-sm text-muted-foreground">
                Buyers can also pay cash when they collect in person in Perth. Cards aren&apos;t available yet.
            </p>
        </div>
    );
}
