"use client"

import * as React from "react";
import Link from 'next/link';
import { features } from '@/lib/features';
import { useUser } from '@/firebase';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';

export function MainNavLinks() {
  const { user } = useUser();

  return (
    <nav className="flex items-center gap-6">
      <Link href="/browse" className={cn(buttonVariants({ variant: "ghost" }), "text-sm font-bold uppercase tracking-widest hover:text-primary hover:bg-primary/5 px-3 rounded-xl transition-all duration-300")}>
        Shoes
      </Link>

      <Link href="/cards" className={cn(buttonVariants({ variant: "ghost" }), "text-sm font-bold uppercase tracking-widest hover:text-primary hover:bg-primary/5 px-3 rounded-xl transition-all duration-300")}>
        Cards
      </Link>

      {features.bidsy && (
        <Link href="/bidsy" className={cn(buttonVariants({ variant: "ghost" }), "text-sm font-bold uppercase tracking-widest hover:text-primary hover:bg-primary/5 px-3 rounded-xl transition-all duration-300")}>
          Bidsy
        </Link>
      )}

      {features.wtb && (
        <Link href="/wtb" className={cn(buttonVariants({ variant: "ghost" }), "text-sm font-bold uppercase tracking-widest hover:text-primary hover:bg-primary/5 px-3 rounded-xl transition-all duration-300")}>
          Wanted
        </Link>
      )}

      {user && (
        <>
          <Link href="/research" className={cn(buttonVariants({ variant: "ghost" }), "text-sm font-bold uppercase tracking-widest hover:text-primary hover:bg-primary/5 px-3 rounded-xl transition-all duration-300")}>
            Research
          </Link>
        </>
      )}

      <Link href="/dealsafe" className={cn(buttonVariants({ variant: "ghost" }), "text-sm font-bold uppercase tracking-widest hover:text-primary hover:bg-primary/5 px-3 rounded-xl transition-all duration-300")}>
        DealSafe
      </Link>

      <Link href="/donate" className={cn(buttonVariants({ variant: "default" }), "text-sm font-bold uppercase tracking-widest px-4 rounded-xl shadow-lg shadow-primary/20 ml-2")}>
        Donate
      </Link>
    </nav>
  );
}
