'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Clock, Trash2 } from 'lucide-react';
import { useUser } from '@/firebase';
import { formatPrice } from '@/lib/utils/format';
import { isLocalOrderActive, listGuestOrders, removeGuestOrder, type LocalGuestOrder } from '@/lib/checkout/guest-orders-local';

function useLocalGuestOrders() {
    const [orders, setOrders] = useState<LocalGuestOrder[]>([]);
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const load = () => { setOrders(listGuestOrders()); setNow(Date.now()); };
        load();
        const id = setInterval(load, 30_000);
        window.addEventListener('benched-guest-orders', load);
        window.addEventListener('storage', load);
        return () => { clearInterval(id); window.removeEventListener('benched-guest-orders', load); window.removeEventListener('storage', load); };
    }, []);
    return { orders, now };
}

/** Slim bar under the header for a returning guest whose 30-minute hold is still running. */
export function GuestActiveOrdersBar() {
    const { user } = useUser();
    const pathname = usePathname();
    const { orders, now } = useLocalGuestOrders();
    const active = orders.filter((o) => isLocalOrderActive(o, now));
    if (user || !active.length || pathname?.startsWith('/order')) return null;
    const first = active[0];
    const mins = Math.max(1, Math.ceil(((first.holdExpiresAtMs || now) - now) / 60_000));
    return (
        <div className="border-b border-amber-300 bg-amber-50 text-amber-900" data-testid="guest-active-orders-bar">
            <div className="container mx-auto flex items-center justify-between gap-3 px-4 py-2 text-sm">
                <p className="flex min-w-0 items-center gap-2">
                    <Clock className="h-4 w-4 shrink-0" aria-hidden />
                    <span className="truncate">
                        <b>Your active order{active.length > 1 ? 's' : ''}:</b> {first.title} is held for about {mins} more min. Pay by PayID to secure it.
                    </span>
                </p>
                <Link href={active.length > 1 ? '/order' : `/order/${first.token}`} className="shrink-0 font-bold underline">
                    {active.length > 1 ? `View ${active.length} orders` : 'View order'}
                </Link>
            </div>
        </div>
    );
}

/** /order: every guest order remembered on this device. */
export function GuestOrdersList() {
    const { orders, now } = useLocalGuestOrders();
    if (!orders.length) {
        return (
            <p className="text-muted-foreground">
                No orders saved on this device. If you bought something on another phone or browser, open the order link you saved there.
            </p>
        );
    }
    return (
        <ul className="space-y-3" data-testid="guest-orders-list">
            {orders.map((o) => {
                const active = isLocalOrderActive(o, now);
                return (
                    <li key={o.token} className="flex items-center justify-between gap-3 rounded-2xl border bg-card p-4">
                        <div className="min-w-0">
                            <Link href={`/order/${o.token}`} className="block truncate font-bold underline">{o.title}</Link>
                            <p className="text-xs text-muted-foreground">
                                {o.reference ? `Ref ${o.reference} · ` : ''}{typeof o.totalAmount === 'number' ? `$${formatPrice(o.totalAmount)} · ` : ''}
                                {active ? 'On hold, awaiting your PayID payment' : o.status === 'cancelled' ? 'Cancelled' : o.status === 'awaiting_payment' ? 'Awaiting payment' : o.status ? o.status.replace(/_/g, ' ') : 'Order'}
                                {' · '}{new Date(o.createdAtMs).toLocaleDateString('en-AU')}
                            </p>
                        </div>
                        <button type="button" className="rounded-lg p-2 text-muted-foreground hover:bg-muted" aria-label={`Forget ${o.title} on this device`} onClick={() => removeGuestOrder(o.token)}>
                            <Trash2 className="h-4 w-4" />
                        </button>
                    </li>
                );
            })}
        </ul>
    );
}
