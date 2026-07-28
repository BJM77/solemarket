"use client"

import * as React from "react";
import Link from 'next/link';
import { features } from '@/lib/features';
import { useUser } from '@/firebase';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import { useSiteConfig } from '@/providers/SiteConfigProvider';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Store, TrendingUp, ShieldCheck, BookOpen, Search, Gavel, LineChart, LayoutGrid, Link as LinkIcon } from "lucide-react";

const getIcon = (name?: string) => {
  switch (name) {
    case 'Store': return <Store className="h-4 w-4" />;
    case 'TrendingUp': return <TrendingUp className="h-4 w-4 text-primary" />;
    case 'LayoutGrid': return <LayoutGrid className="h-4 w-4 text-emerald-500" />;
    case 'ShieldCheck': return <ShieldCheck className="h-4 w-4" />;
    case 'BookOpen': return <BookOpen className="h-4 w-4" />;
    case 'Search': return <Search className="h-4 w-4" />;
    case 'Gavel': return <Gavel className="h-4 w-4" />;
    case 'LineChart': return <LineChart className="h-4 w-4" />;
    default: return <LinkIcon className="h-4 w-4" />;
  }
};

export function MainNavLinks() {
  const { user } = useUser();
  const { config } = useSiteConfig();

  // Filter out disabled menus and sort by order
  const activeMenus = React.useMemo(() => {
    if (!config?.menus) return [];
    return [...config.menus]
      .filter((m) => m.enabled !== false)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [config?.menus]);

  if (activeMenus.length === 0) return null;

  return (
    <nav className="flex items-center gap-6">
      {activeMenus.map((menu) => {
        // Render dropdown if has sub-items
        if (menu.subItems && menu.subItems.length > 0) {
          return (
            <div key={menu.id} className="flex items-center">
              <DropdownMenu>
                <DropdownMenuTrigger className={cn(buttonVariants({ variant: "ghost" }), "text-sm font-bold uppercase tracking-widest hover:text-primary hover:bg-primary/5 px-3 rounded-xl transition-all duration-300 flex items-center gap-1 group")}>
                  {menu.label}
                  <ChevronDown className="h-3 w-3 group-data-[state=open]:rotate-180 transition-transform duration-300" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[200px] p-2 bg-background/95 backdrop-blur-md border border-border/50 rounded-2xl shadow-2xl">
                  {menu.subItems.map((sub, sIdx) => (
                    <DropdownMenuItem key={sIdx} asChild className="rounded-xl focus:bg-primary/5 focus:text-primary cursor-pointer py-3">
                      <Link href={sub.href} className="flex items-center gap-2 font-bold uppercase tracking-widest text-xs">
                        {getIcon(sub.iconName)}
                        {sub.label}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        }

        // Render simple link
        return (
          <Link
            key={menu.id}
            href={menu.href}
            className={cn(
              buttonVariants({ variant: "ghost" }),
              "text-sm font-bold uppercase tracking-widest hover:text-primary hover:bg-primary/5 px-3 rounded-xl transition-all duration-300",
              menu.label.toLowerCase() === 'fundraising' && "text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300"
            )}
          >
            {menu.label}
          </Link>
        );
      })}
    </nav>
  );
}
