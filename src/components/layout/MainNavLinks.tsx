"use client"

import * as React from "react";
import Link from 'next/link';
import { features } from '@/lib/features';
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  NavigationMenuContent,
} from '@/components/ui/navigation-menu';
import { navigationMenuTriggerStyle } from '@/components/ui/navigation-menu';
import { useUser } from '@/firebase';
import { cn } from '@/lib/utils';
import {
  Zap,
  Dribbble,
  Trophy,
  Wind,
  Car,
  Wand2,
  CircleDollarSign,
  DollarSign,
  Coins as CoinsIcon,
  ScanLine,
  Search,
  Handshake,
  Shield,
  Tag,
  Layers
} from 'lucide-react';

export function MainNavLinks() {
  const { user } = useUser();

  return (
    <NavigationMenu>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger>Cards</NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="grid w-[340px] gap-1 p-2">
              {[
                { title: "Pokemon", href: "/collector-cards?subCategory=Pokemon", icon: Zap, color: "text-yellow-600" },
                { title: "NBA", href: "/collector-cards?subCategory=NBA", icon: Dribbble, color: "text-orange-600" },
                { title: "WWE", href: "/collector-cards?subCategory=WWE", icon: Trophy, color: "text-purple-600" },
                { title: "NFL", href: "/collector-cards?subCategory=NFL", icon: Trophy, color: "text-amber-600" },
                { title: "AFL", href: "/collector-cards?subCategory=AFL", icon: Wind, color: "text-red-600" },
                { title: "Soccer", href: "/collector-cards?subCategory=Soccer", icon: Trophy, color: "text-green-600" },
                { title: "F1", href: "/collector-cards?subCategory=F1", icon: Car, color: "text-gray-700" },
                { title: "Fantasy", href: "/collector-cards?subCategory=Fantasy", icon: Wand2, color: "text-indigo-600" },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <IconMenuItem
                    key={item.title}
                    title={item.title}
                    href={item.href}
                    icon={<Icon className={cn("h-5 w-5", item.color)} />}
                  />
                );
              })}
              <li className="border-t pt-1 mt-1">
                <NavigationMenuLink asChild>
                  <Link
                    href="/collector-cards"
                    className="flex items-center gap-2 rounded-md p-2 text-sm font-medium hover:bg-accent transition-colors"
                  >
                    <span className="text-muted-foreground">View All Cards →</span>
                  </Link>
                </NavigationMenuLink>
              </li>
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>

        <NavigationMenuItem>
          <NavigationMenuTrigger>Coins</NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="grid w-[280px] gap-1 p-2">
              {[
                { title: "$2 Coins", href: "/coins?subCategory=$2", icon: CircleDollarSign, color: "text-amber-600" },
                { title: "$1 Coins", href: "/coins?subCategory=$1", icon: DollarSign, color: "text-yellow-600" },
                { title: "50c Coins", href: "/coins?subCategory=50c", icon: CoinsIcon, color: "text-slate-600" },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <IconMenuItem
                    key={item.title}
                    title={item.title}
                    href={item.href}
                    icon={<Icon className={cn("h-5 w-5", item.color)} />}
                  />
                );
              })}
              <li className="border-t pt-1 mt-1">
                <NavigationMenuLink asChild>
                  <Link
                    href="/coins"
                    className="flex items-center gap-2 rounded-md p-2 text-sm font-medium hover:bg-accent transition-colors"
                  >
                    <span className="text-muted-foreground">View All Coins →</span>
                  </Link>
                </NavigationMenuLink>
              </li>
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>

        <NavigationMenuItem>
          <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
            <Link href="/collectibles">
              Memorabilia
            </Link>
          </NavigationMenuLink>
        </NavigationMenuItem>

        <NavigationMenuItem>
          <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
            <Link href="/general">
              General
            </Link>
          </NavigationMenuLink>
        </NavigationMenuItem>

        {features.bidsy && (
          <NavigationMenuItem>
            <NavigationMenuLink asChild>
              <Link href="/bidsy" className={navigationMenuTriggerStyle()}>
                Bidsy
              </Link>
            </NavigationMenuLink>
          </NavigationMenuItem>
        )}

        {features.wtb && (
          <NavigationMenuItem>
            <NavigationMenuLink asChild>
              <Link href="/wtb" className={navigationMenuTriggerStyle()}>
                Wanted
              </Link>
            </NavigationMenuLink>
          </NavigationMenuItem>
        )}

        <NavigationMenuItem>
          <NavigationMenuTrigger>Deals</NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="grid w-[280px] gap-1 p-2">
              <IconMenuItem
                title="Multibuy Deals"
                href="/multibuy"
                icon={<Tag className="h-5 w-5 text-orange-600" />}
                description="Bulk savings on single items"
              />
              <IconMenuItem
                title="Multilisting Deals"
                href="/multilisting-deals"
                icon={<Layers className="h-5 w-5 text-blue-600" />}
                description="Build your own custom bundle"
              />
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>

        <NavigationMenuItem>
          <NavigationMenuTrigger>Tools</NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="grid w-[280px] gap-1 p-2">
              <IconMenuItem
                title="Scan Cards"
                href="/scan"
                icon={<ScanLine className="h-5 w-5 text-blue-600" />}
                description="AI-powered card identification"
              />
              <IconMenuItem
                title="Research"
                href="/research"
                icon={<Search className="h-5 w-5 text-purple-600" />}
                description="Price history and analysis"
              />
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>

        <NavigationMenuItem>
          <NavigationMenuTrigger>Services</NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="grid w-[280px] gap-1 p-2">
              {features.consignment && (
                <IconMenuItem
                  title="Consign"
                  href="/consign"
                  icon={<Handshake className="h-5 w-5 text-emerald-600" />}
                  description="Sell your top-tier collectibles"
                />
              )}
              <IconMenuItem
                title="DealSafe"
                href="/dealsafe"
                icon={<Shield className="h-5 w-5 text-blue-600" />}
                description="Secure transactions for buyers and sellers"
              />
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>

      </NavigationMenuList>
    </NavigationMenu>
  );
}

const IconMenuItem = React.forwardRef<
  HTMLAnchorElement,
  {
    title: string;
    href: string;
    icon: React.ReactNode;
    description?: string;
  }
>(({ title, href, icon, description }, ref) => {
  return (
    <li>
      <NavigationMenuLink asChild>
        <Link
          ref={ref}
          href={href}
          className="flex items-center gap-3 rounded-md p-2.5 hover:bg-accent transition-colors group"
        >
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-accent/50 flex items-center justify-center group-hover:bg-accent">
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium">{title}</div>
            {description && (
              <p className="text-xs text-muted-foreground line-clamp-1">
                {description}
              </p>
            )}
          </div>
        </Link>
      </NavigationMenuLink>
    </li>
  );
});
IconMenuItem.displayName = "IconMenuItem";
