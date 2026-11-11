'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { collection, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';
import { SELLER_ORDERS_PATH } from '@/lib/notifications/push-payload';

/**
 * In-app alert for sellers: a toast whenever a new order notification arrives while the site
 * is open (the bell shows the unread count). Same query as the bell, so Firestore shares the
 * listener. Only notifications created after the page loaded pop up.
 */
export function NewOrderAlerts() {
    const { user } = useUser();
    const { toast } = useToast();
    const router = useRouter();
    const seen = useRef<Set<string> | null>(null);

    useEffect(() => {
        if (!user?.uid) return;
        seen.current = null;
        const q = query(collection(db, 'notifications'), where('recipientId', '==', user.uid), orderBy('createdAt', 'desc'), limit(20));
        const unsub = onSnapshot(q, (snap) => {
            if (seen.current === null) {
                seen.current = new Set(snap.docs.map((d) => d.id));
                return;
            }
            snap.docChanges().forEach((c) => {
                if (c.type !== 'added' || seen.current!.has(c.doc.id)) return;
                seen.current!.add(c.doc.id);
                const n = c.doc.data() as any;
                if (n.read || n.type !== 'sale') return;
                const link = typeof n.link === 'string' && n.link.startsWith('/') ? n.link : SELLER_ORDERS_PATH;
                toast({
                    title: n.title || 'New order',
                    description: n.message,
                    action: <ToastAction altText="View order" onClick={() => router.push(link)}>View</ToastAction>,
                });
            });
        }, () => { /* permission or network error: the bell still works */ });
        return () => unsub();
    }, [user?.uid, toast, router]);

    return null;
}
