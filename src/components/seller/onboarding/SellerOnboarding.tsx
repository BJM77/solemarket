'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { doc } from 'firebase/firestore';
import { CheckCircle2, Circle, ChevronRight, Clock, Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useFirebase, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { getMyActiveListingCount } from '@/app/actions/seller/onboarding';
import { getCurrentUserIdToken } from '@/lib/firebase/auth';
import { buildOnboardingChecklist, onboardingProgress, type OnboardingProfile } from '@/lib/seller-onboarding/checklist';
import { cn } from '@/lib/utils/ui';

/** Full checklist (page) or compact progress card (dashboard) for new sellers. */
export default function SellerOnboarding({ compact = false }: { compact?: boolean }) {
  const { firestore } = useFirebase();
  const { user, isUserLoading } = useUser();
  const ref = useMemoFirebase(() => (firestore && user ? doc(firestore, 'users', user.uid) : null), [firestore, user]);
  const { data: profile, isLoading } = useDoc<OnboardingProfile>(ref);
  const [listings, setListings] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    getCurrentUserIdToken().then((t) => (t ? getMyActiveListingCount(t) : 0)).then(setListings).catch(() => setListings(0));
  }, [user]);

  if (isUserLoading || isLoading || listings === null) {
    return compact ? null : <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" aria-label="Loading" /></div>;
  }
  if (!user) return null;

  const steps = buildOnboardingChecklist({ ...(profile || {}), photoURL: profile?.photoURL || user.photoURL || undefined, displayName: profile?.displayName || user.displayName || undefined }, listings);
  const progress = onboardingProgress(steps);

  if (compact) {
    if (progress.done === progress.total) return null;
    return (
      <Link href="/sell/onboarding" className="mb-8 block rounded-2xl border border-primary/40 bg-primary/5 p-5 hover:bg-primary/10">
        <div className="mb-2 flex items-center justify-between gap-4">
          <p className="font-bold">Finish setting up your store ({progress.done}/{progress.total})</p>
          <ChevronRight className="h-5 w-5" aria-hidden />
        </div>
        <Progress value={progress.percent} aria-label="Seller setup progress" />
        {progress.next && <p className="mt-2 text-sm text-muted-foreground">Next: {progress.next.title}</p>}
      </Link>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-1 text-3xl font-black tracking-tight">Start selling on Benched</h1>
      <p className="mb-6 text-muted-foreground">{progress.done} of {progress.total} steps complete</p>
      <Progress value={progress.percent} className="mb-8" aria-label="Seller setup progress" />
      <ol className="space-y-3">
        {steps.map((s) => {
          const Icon = s.done ? CheckCircle2 : s.comingSoon ? Clock : Circle;
          const body = (
            <div className={cn('flex items-start gap-4 rounded-2xl border p-4', s.done && 'opacity-70', progress.next?.id === s.id && 'border-primary')}>
              <Icon className={cn('mt-0.5 h-6 w-6 shrink-0', s.done ? 'text-emerald-500' : 'text-muted-foreground')} aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="font-bold">
                  {s.title}
                  {s.comingSoon && <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs font-semibold">Coming soon</span>}
                  <span className="sr-only">{s.done ? ' (done)' : ' (to do)'}</span>
                </p>
                <p className="text-sm text-muted-foreground">{s.description}</p>
              </div>
              {!s.done && !s.comingSoon && <ChevronRight className="mt-1 h-5 w-5 shrink-0" aria-hidden />}
            </div>
          );
          return <li key={s.id}>{s.done || s.comingSoon ? body : <Link href={s.href} className="block min-h-11">{body}</Link>}</li>;
        })}
      </ol>
    </div>
  );
}
