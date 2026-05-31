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
import { ChevronDown, Store, TrendingUp, ShieldCheck, BookOpen, Search, Gavel, LineChart } from "lucide-react";

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

      <Link href="/coins" className={cn(buttonVariants({ variant: "ghost" }), "text-sm font-bold uppercase tracking-widest hover:text-primary hover:bg-primary/5 px-3 rounded-xl transition-all duration-300")}>
        Coins
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

            {features.bidsy && (
              <DropdownMenuItem asChild className="rounded-xl focus:bg-primary/5 focus:text-primary cursor-pointer py-3">
                <Link href="/bidsy" className="flex items-center gap-2 font-bold uppercase tracking-widest text-xs">
                  <Gavel className="h-4 w-4" />
                  Bidsy
                </Link>
              </DropdownMenuItem>
            )}

            {features.wtb && (
              <DropdownMenuItem asChild className="rounded-xl focus:bg-primary/5 focus:text-primary cursor-pointer py-3">
                <Link href="/wtb" className="flex items-center gap-2 font-bold uppercase tracking-widest text-xs">
                  <Search className="h-4 w-4" />
                  Wanted
                </Link>
              </DropdownMenuItem>
            )}

            {user && (
              <DropdownMenuItem asChild className="rounded-xl focus:bg-primary/5 focus:text-primary cursor-pointer py-3">
                <Link href="/research" className="flex items-center gap-2 font-bold uppercase tracking-widest text-xs">
                  <LineChart className="h-4 w-4" />
                  Research
                </Link>
              </DropdownMenuItem>
            )}

            <DropdownMenuItem asChild className="rounded-xl focus:bg-primary/5 focus:text-primary cursor-pointer py-3">
              <Link href="/guides" className="flex items-center gap-2 font-bold uppercase tracking-widest text-xs">
                <BookOpen className="h-4 w-4" />
                Guides
              </Link>
            </DropdownMenuItem>

            <DropdownMenuItem asChild className="rounded-xl focus:bg-primary/5 focus:text-primary cursor-pointer py-3">
              <Link href="/dealsafe" className="flex items-center gap-2 font-bold uppercase tracking-widest text-xs">
                <ShieldCheck className="h-4 w-4" />
                DealSafe
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
}
