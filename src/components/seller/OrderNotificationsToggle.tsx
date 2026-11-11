'use client';

import { useEffect, useState } from 'react';
import { Bell, BellOff, BellRing, Loader2, Share, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { getCurrentUserIdToken } from '@/lib/firebase/auth';
import type { PushSupport } from '@/lib/notifications/push-env';
import { sendTestPushAction } from '@/app/actions/seller/push-notifications';

type State = 'loading' | 'off' | 'on' | 'blocked' | PushSupport;

/**
 * "Enable order notifications" for sellers: free push notifications on this phone or computer
 * when someone sends a request or offer, accepts a counter-offer, or cancels. Shown in the seller dashboard
 * and the Seller Hub.
 */
export function OrderNotificationsToggle({ compact = false }: { compact?: boolean }) {
    const { user } = useUser();
    const { toast } = useToast();
    const [state, setState] = useState<State>('loading');
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (!user?.uid) return;
        let cancelled = false;
        (async () => {
            const m = await import('@/lib/firebase/messaging');
            const support = m.getPushSupport();
            if (support !== 'supported') { if (!cancelled) setState(support); return; }
            const perm = m.notificationPermission();
            if (perm === 'denied') { if (!cancelled) setState('blocked'); return; }
            if (perm === 'granted' && m.hasLocalPushToken()) {
                if (!cancelled) setState('on');
                // FCM tokens rotate: keep the saved one current.
                m.refreshOrderNotificationToken().catch(() => {});
                return;
            }
            if (!cancelled) setState('off');
        })().catch(() => { if (!cancelled) setState('unsupported'); });
        return () => { cancelled = true; };
    }, [user?.uid]);

    if (!user) return null;

    const enable = async () => {
        setBusy(true);
        try {
            const m = await import('@/lib/firebase/messaging');
            await m.enableOrderNotifications();
            setState('on');
            toast({ title: 'Order notifications are on', description: "We'll notify this device when you get an order." });
        } catch (e: any) {
            if (typeof Notification !== 'undefined' && Notification.permission === 'denied') setState('blocked');
            toast({ title: "Couldn't turn on notifications", description: e?.message || 'Please try again.', variant: 'destructive' });
        } finally {
            setBusy(false);
        }
    };

    const disable = async () => {
        setBusy(true);
        try {
            const m = await import('@/lib/firebase/messaging');
            await m.disableOrderNotifications();
            setState('off');
            toast({ title: 'Notifications turned off on this device' });
        } catch (e: any) {
            toast({ title: "Couldn't turn off notifications", description: e?.message, variant: 'destructive' });
        } finally {
            setBusy(false);
        }
    };

    const test = async () => {
        setBusy(true);
        try {
            const idToken = await getCurrentUserIdToken();
            if (!idToken) throw new Error('Please sign in again.');
            const r = await sendTestPushAction(idToken);
            if (!r.success) throw new Error(r.error);
            toast({ title: 'Test sent', description: 'It should pop up in a few seconds.' });
        } catch (e: any) {
            toast({ title: 'Test failed', description: e?.message, variant: 'destructive' });
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className={`rounded-2xl border border-border bg-card ${compact ? 'p-4' : 'p-5'}`} data-testid="order-notifications">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                    {state === 'on' ? <BellRing className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden /> : <Bell className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />}
                    <div>
                        <p className="font-bold text-foreground">Order notifications on this device</p>
                        <p className="text-sm text-muted-foreground">
                            {state === 'on'
                                ? "On. You'll get a notification for new orders, buyer cancellations and holds that run out."
                                : 'Get a notification on this phone or computer the moment someone sends a request or offer, so you can accept it quickly.'}
                        </p>
                    </div>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                    {state === 'loading' && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
                    {state === 'off' && (
                        <Button onClick={enable} disabled={busy} className="min-h-11 font-bold" data-testid="enable-order-notifications">
                            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />} Enable order notifications
                        </Button>
                    )}
                    {state === 'on' && (
                        <>
                            <Button variant="outline" onClick={test} disabled={busy} className="min-h-11">Send a test</Button>
                            <Button variant="ghost" onClick={disable} disabled={busy} className="min-h-11 text-muted-foreground">
                                <BellOff className="h-4 w-4" /> Turn off
                            </Button>
                        </>
                    )}
                </div>
            </div>
            {state === 'ios-needs-home-screen' && (
                <div className="mt-3 flex items-start gap-2 rounded-xl bg-muted p-3 text-sm text-foreground/80" data-testid="ios-push-hint">
                    <Smartphone className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                    <p>
                        On iPhone, notifications only work from the Home Screen app: tap <Share className="inline h-3.5 w-3.5" aria-label="Share" /> Share in Safari,
                        choose <b>Add to Home Screen</b>, open Benched from the new icon, sign in and tap Enable here. Needs iOS 16.4 or later.
                    </p>
                </div>
            )}
            {state === 'ios-too-old' && (
                <p className="mt-3 rounded-xl bg-muted p-3 text-sm text-foreground/80">Notifications need iOS 16.4 or later. Update your iPhone, or turn them on from your computer. New orders still show in your dashboard and the bell.</p>
            )}
            {state === 'unsupported' && (
                <p className="mt-3 rounded-xl bg-muted p-3 text-sm text-foreground/80">This browser can&apos;t show notifications. Try Chrome, Edge or Firefox. New orders still show in your dashboard and the bell.</p>
            )}
            {state === 'blocked' && (
                <p className="mt-3 rounded-xl bg-muted p-3 text-sm text-foreground/80">Notifications are blocked for benched.au. Allow them in your browser&apos;s site settings (the icon next to the address), then reload this page.</p>
            )}
        </div>
    );
}
