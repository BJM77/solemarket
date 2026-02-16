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
      <Link href="/browse" className={cn(buttonVariants({ variant: "ghost" }), "text-sm font-medium hover:bg-transparent px-0")}>
        Explore
      </Link>

      <Link href="/multilisting-deals" className={cn(buttonVariants({ variant: "ghost" }), "text-sm font-medium hover:bg-transparent px-0")}>
        Multi
      </Link>

      {features.bidsy && (
        <Link href="/bidsy" className={cn(buttonVariants({ variant: "ghost" }), "text-sm font-medium hover:bg-transparent px-0")}>
          Bidsy
        </Link>
      )}

      {features.wtb && (
        <Link href="/wtb" className={cn(buttonVariants({ variant: "ghost" }), "text-sm font-medium hover:bg-transparent px-0")}>
          Wanted
        </Link>
      )}

      {user && (
        <>
          <Link href="/scan" className={cn(buttonVariants({ variant: "ghost" }), "text-sm font-medium hover:bg-transparent px-0")}>
            Scan
          </Link>
          <Link href="/tools/grader" className={cn(buttonVariants({ variant: "ghost" }), "text-sm font-medium hover:bg-transparent px-0")}>
            AI Grader
          </Link>
          <Link href="/research" className={cn(buttonVariants({ variant: "ghost" }), "text-sm font-medium hover:bg-transparent px-0")}>
            Research
          </Link>
        </>
      )}

      <Link href="/dealsafe" className={cn(buttonVariants({ variant: "ghost" }), "text-sm font-medium hover:bg-transparent px-0")}>
        DealSafe
      </Link>

      {features.consignment && (
        <Link href="/consign" className={cn(buttonVariants({ variant: "ghost" }), "text-sm font-medium hover:bg-transparent px-0")}>
          Consign
        </Link>
      )}
    </nav>
  );
}
