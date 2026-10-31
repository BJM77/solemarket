"use client"

import * as React from "react";
import Link from 'next/link';
import { features } from '@/lib/features';
import { useUser } from '@/firebase';
import { cn } from "@/lib/utils/ui";
import { buttonVariants } from '@/components/ui/button';
import { useSiteConfig } from '@/providers/SiteConfigProvider';
import { HoverMenu } from './HoverMenu';
import { Store, TrendingUp, ShieldCheck, BookOpen, Search, Gavel, LineChart, LayoutGrid, Link as LinkIcon } from "lucide-react";

const getIcon = (name?: string) => {
  switch (name) {
    case 'Store': return <Store className="h-4 w-4" />;
    case 'TrendingUp': return <TrendingUp className="h-4 w-4 text-primary" />;
    case 'LayoutGrid': return <LayoutGrid className="h-4 w-4 text-emerald-700" />;
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
    <nav aria-label="Main" className="flex items-center gap-2 xl:gap-4">
      {activeMenus.map((menu) => {
        // Render dropdown if has sub-items
        if (menu.subItems && menu.subItems.length > 0) {
          return (
            <HoverMenu
              key={menu.id}
              label={menu.label}
              items={menu.subItems.map((sub) => ({ label: sub.label, href: sub.href, icon: getIcon(sub.iconName) }))}
            />
          );
        }

        // Render simple link
        return (
          <Link
            key={menu.id}
            href={menu.href}
            className={cn(
              buttonVariants({ variant: "ghost" }),
              "h-10 text-sm font-bold uppercase tracking-widest hover:text-primary hover:bg-primary/5 px-3 rounded-xl transition-colors focus-visible:ring-2 focus-visible:ring-primary",
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
