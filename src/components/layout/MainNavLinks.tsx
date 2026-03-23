"use client"

import * as React from "react";
import Link from 'next/link';
import { features } from '@/lib/features';
import { useUser } from '@/firebase';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Store, TrendingUp } from "lucide-react";

export function MainNavLinks() {
  const { user } = useUser();

  return (
    <nav className="flex items-center gap-6">
      <Link href="/shoes" className={cn(buttonVariants({ variant: "ghost" }), "text-sm font-bold uppercase tracking-widest hover:text-primary hover:bg-primary/5 px-3 rounded-xl transition-all duration-300")}>
        Shoes
      </Link>

      <Link href="/cards" className={cn(buttonVariants({ variant: "ghost" }), "text-sm font-bold uppercase tracking-widest hover:text-primary hover:bg-primary/5 px-3 rounded-xl transition-all duration-300")}>
        Cards
      </Link>

      <div className="flex items-center">
        <DropdownMenu>
          <DropdownMenuTrigger className={cn(buttonVariants({ variant: "ghost" }), "text-sm font-bold uppercase tracking-widest hover:text-primary hover:bg-primary/5 px-3 rounded-xl transition-all duration-300 flex items-center gap-1 group")}>
            The Lineup
            <ChevronDown className="h-3 w-3 group-data-[state=open]:rotate-180 transition-transform duration-300" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[200px] p-2 bg-background/95 backdrop-blur-md border border-border/50 rounded-2xl shadow-2xl">
            <DropdownMenuItem asChild className="rounded-xl focus:bg-primary/5 focus:text-primary cursor-pointer py-3">
              <Link href="/browse" className="flex items-center gap-2 font-bold uppercase tracking-widest text-xs">
                <Store className="h-4 w-4" />
                Browse All
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="rounded-xl focus:bg-primary/5 focus:text-primary cursor-pointer py-3">
              <Link href="/top-stores" className="flex items-center gap-2 font-bold uppercase tracking-widest text-xs">
                <TrendingUp className="h-4 w-4" />
                Top 10 Stores
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

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

      <Link href="/guides" className={cn(buttonVariants({ variant: "ghost" }), "text-sm font-bold uppercase tracking-widest hover:text-primary hover:bg-primary/5 px-3 rounded-xl transition-all duration-300")}>
        Guides
      </Link>

      <Link href="/dealsafe" className={cn(buttonVariants({ variant: "ghost" }), "text-sm font-bold uppercase tracking-widest hover:text-primary hover:bg-primary/5 px-3 rounded-xl transition-all duration-300")}>
        DealSafe
      </Link>

    </nav>
  );
}
