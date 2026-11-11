import type { Metadata } from 'next';
import Link from 'next/link';
import { GuestOrdersList } from '@/components/checkout/GuestActiveOrders';

export const metadata: Metadata = {
    title: 'Your active orders | Benched',
    robots: { index: false, follow: false },
};

export default function GuestOrdersPage() {
    return (
        <div className="container mx-auto max-w-2xl space-y-6 px-4 py-8">
            <div className="space-y-2">
                <h1 className="text-2xl font-black">Your active orders</h1>
                <p className="text-sm text-muted-foreground">
                    Orders you placed without an account on this device. They&apos;re only saved in this browser, so keep your order links too.
                    Have an account? <Link href="/profile/orders" className="font-bold underline">See your orders</Link>.
                </p>
            </div>
            <GuestOrdersList />
        </div>
    );
}
