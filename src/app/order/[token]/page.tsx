import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getGuestOrderByToken } from '@/lib/checkout/guest-server';
import { isPlausibleOrderToken } from '@/lib/checkout/guest-crypto';
import GuestOrderClient from './GuestOrderClient';

// Private, per-buyer page: never cached, never indexed.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
    title: 'Your order | Benched',
    robots: { index: false, follow: false },
    referrer: 'no-referrer',
};

export default async function GuestOrderPage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = await params;
    if (!isPlausibleOrderToken(token)) notFound();
    const order = await getGuestOrderByToken(token);
    if (!order) notFound();
    return <GuestOrderClient token={token} order={order} />;
}
