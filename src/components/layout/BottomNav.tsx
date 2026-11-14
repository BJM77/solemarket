'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { getImageProps } from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { Home, Search, PlusCircle, Bell, User, ShoppingBag, Pencil, ChevronLeft, ChevronRight } from 'lucide-react';
import { GALLERY_SIZES, listingIdFromPath } from '@/lib/listing-nav';
import { captureListingClick, useListingSequence } from '@/lib/listing-nav/store';
import { ListingSequenceEnd } from '@/components/products/ListingSequenceEnd';
import { cn } from "@/lib/utils/ui";
import { useUser } from '@/firebase';
import { useMobileNav } from '@/context/MobileNavContext';

export function BottomNav() {
  const pathname = usePathname();
  const { user } = useUser();
  const { isVisible, buyAction } = useMobileNav();
  const listingId = listingIdFromPath(pathname);
  const seq = useListingSequence(listingId, pathname);
  const [showEnd, setShowEnd] = useState(false);
  useEffect(() => { setShowEnd(false); }, [listingId]);

  // Remember which grid/list a listing tile was tapped from.
  useEffect(() => {
    document.addEventListener('click', captureListingClick, true);
    return () => document.removeEventListener('click', captureListingClick, true);
  }, []);

  const nav = useMemo(() => (seq ? {
    prev: seq.prev?.url ?? null, next: seq.next?.url ?? null, prevImage: seq.prev?.image ?? null, nextImage: seq.next?.image ?? null,
  } : null), [seq?.prev?.url, seq?.next?.url, seq?.prev?.image, seq?.next?.image]); // eslint-disable-line react-hooks/exhaustive-deps
  const router = useRouter();

  // Warm the Next (then Previous) listing: route payload + its main photo at the gallery's srcset.
  useEffect(() => {
    if (!nav) return;
    const targets: [string | null, string | null | undefined][] = [[nav.next, nav.nextImage], [nav.prev, nav.prevImage]];
    for (const [href, image] of targets) {
      if (!href) continue;
      try { router.prefetch(href); } catch { /* ignore */ }
      if (image) {
        try {
          const { props } = getImageProps({ src: image, alt: '', fill: true, sizes: GALLERY_SIZES });
          const img = new window.Image();
          img.fetchPriority = href === nav.next ? 'high' : 'low';
          if (props.sizes) img.sizes = props.sizes;
          if (props.srcSet) img.srcset = props.srcSet;
          img.src = props.src;
        } catch { /* ignore */ }
      }
    }
  }, [nav, router]);

  const navItems: { label: string; href: string | null; icon: any; primary?: boolean; testId?: string; onEnd?: boolean }[] = [
    { label: 'Home', href: '/', icon: Home },
    listingId
      ? { label: 'Previous', href: nav?.prev ?? null, icon: ChevronLeft, testId: 'bottom-nav-prev' }
      : { label: 'Lineup', href: '/browse', icon: Search },
    { label: 'Sell', href: '/sell/wizard', icon: PlusCircle, primary: true },
    listingId
      ? { label: 'Next', href: nav?.next ?? null, icon: ChevronRight, testId: 'bottom-nav-next', onEnd: !!seq?.done }
      : { label: 'Activity', href: user ? '/profile/orders' : '/sign-in?redirect=/profile/orders', icon: Bell },
    { label: 'Profile', href: user ? '/profile' : '/sign-in?redirect=/profile', icon: User },
  ];

  return (
    <nav className={cn(
      "md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-t border-border/50 px-2 pb-safe pt-2 h-[4.5rem] transition-all duration-500 ease-in-out shadow-[0_-8px_30px_rgb(0,0,0,0.12)]",
      !isVisible ? "translate-y-full opacity-0" : "translate-y-0 opacity-100"
    )}>
      {showEnd && seq && (
        <ListingSequenceEnd returnHref={seq.returnHref} onClose={() => setShowEnd(false)} className="absolute bottom-full left-3 right-3 mb-3" />
      )}
      <div className="flex items-center justify-around h-full max-w-lg mx-auto relative" data-listing-nav>
        {navItems.map((item) => {
          const isActive = !!item.href && (pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href)));

          if (!item.href && item.onEnd) {
            return (
              <button
                key={item.label}
                type="button"
                data-testid={item.testId}
                data-end="true"
                aria-label="No more listings"
                onClick={() => setShowEnd((v) => !v)}
                className="flex flex-col items-center justify-center flex-1 min-h-11 min-w-11 text-muted-foreground hover:text-foreground"
              >
                <div className="p-1 rounded-xl"><item.icon className="h-5 w-5" /></div>
                <span className="text-[11px] font-bold mt-1 uppercase tracking-tighter">{item.label}</span>
              </button>
            );
          }

          if (!item.href) {
            return (
              <span
                key={item.label}
                aria-disabled="true"
                data-testid={item.testId}
                className="flex flex-col items-center justify-center flex-1 min-h-11 min-w-11 text-muted-foreground opacity-40"
              >
                <div className="p-1 rounded-xl"><item.icon className="h-5 w-5" /></div>
                <span className="text-[11px] font-bold mt-1 uppercase tracking-tighter">{item.label}</span>
              </span>
            );
          }

          if (item.primary && buyAction?.editHref) {
            return (
              <Link
                key="edit"
                href={buyAction.editHref}
                aria-label="Edit this listing"
                data-testid="bottom-nav-edit"
                className="relative -top-6 flex flex-col items-center group tap-haptic"
              >
                <div className="bg-primary text-primary-foreground p-4 rounded-full shadow-2xl shadow-primary/40 transition-all duration-300 hover:scale-105 ring-[4px] ring-background">
                  <Pencil className="h-6 w-6" strokeWidth={2.5} />
                </div>
                <span className="text-[11px] font-black mt-1 uppercase tracking-widest text-foreground">Edit</span>
              </Link>
            );
          }

          if (item.primary && buyAction) {
            return (
              <button
                key="buy"
                type="button"
                onClick={() => { if (!buyAction.disabled) buyAction.onBuy(); }}
                disabled={buyAction.disabled}
                aria-label="Buy this listing"
                data-testid="bottom-nav-buy"
                className="relative -top-6 flex flex-col items-center group tap-haptic disabled:opacity-50"
              >
                <div className="bg-slate-900 text-white p-4 rounded-full shadow-2xl shadow-slate-900/40 transition-all duration-300 hover:scale-105 ring-[4px] ring-background">
                  <ShoppingBag className="h-6 w-6" strokeWidth={2.5} />
                </div>
                <span className="text-[11px] font-black mt-1 uppercase tracking-widest text-foreground">
                  {buyAction.disabled ? 'Sold' : 'Buy'}
                </span>
              </button>
            );
          }

          if (item.primary) {
            return (
              <Link
                key={item.label}
                href={item.href}
                className="relative -top-6 flex flex-col items-center group tap-haptic"
              >
                <div className="bg-primary text-primary-foreground p-4 rounded-full shadow-2xl shadow-primary/40 transition-all duration-300 hover:scale-105 ring-[4px] ring-background group-hover:shadow-primary/60 pulse-glow">
                  <item.icon className="h-6 w-6" strokeWidth={3} />
                </div>
                <span className={cn(
                  "text-[11px] font-black mt-1 uppercase tracking-widest transition-colors duration-300",
                  isActive ? "text-foreground" : "text-muted-foreground"
                )}>
                  {item.label}
                </span>
                <div className="absolute -inset-1 bg-primary/20 rounded-full blur-xl opacity-0 group-active:opacity-100 transition-opacity" />
              </Link>
            );
          }

          return (
            <Link
              key={item.label}
              href={item.href}
              data-testid={item.testId}
              aria-label={item.testId ? `${item.label} listing` : undefined}
              className={cn(
                "flex flex-col items-center justify-center flex-1 min-h-11 min-w-11 transition-all duration-300 tap-haptic-subtle group relative",
                isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className={cn(
                "p-1 rounded-xl transition-all duration-300",
                isActive ? "bg-primary/10" : "group-hover:bg-accent/50"
              )}>
                <item.icon className={cn("h-5 w-5 transition-all duration-300", isActive && "stroke-[2.5px] scale-110")} />
              </div>
              <span className={cn(
                "text-[11px] font-bold mt-1 uppercase tracking-tighter transition-all duration-300",
                isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
              )}>
                {item.label}
              </span>

              {isActive && (
                <div className="absolute -top-1 w-1 h-1 bg-primary rounded-full bounce-subtle" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
