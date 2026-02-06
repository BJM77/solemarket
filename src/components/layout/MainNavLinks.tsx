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

export function MainNavLinks() {
  const { user } = useUser();

  return (
    <NavigationMenu>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger>Cards</NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px] bg-white dark:bg-slate-900">
              <li className="row-span-3">
                <NavigationMenuLink asChild>
                  <Link
                    className="flex h-full w-full select-none flex-col justify-end rounded-md bg-gradient-to-b from-muted to-muted/50 p-6 no-underline outline-none focus:shadow-md"
                    href="/collector-cards"
                  >
                    <div className="mb-2 mt-4 text-lg font-medium">
                      All Cards
                    </div>
                    <p className="text-sm leading-tight text-muted-foreground">
                      Browse our entire collection of graded and raw trading cards.
                    </p>
                  </Link>
                </NavigationMenuLink>
              </li>
              {[
                { title: "Pokemon", href: "/collector-cards?subCategory=Pokemon" },
                { title: "NBA", href: "/collector-cards?subCategory=NBA" },
                { title: "WWE", href: "/collector-cards?subCategory=WWE" },
                { title: "NFL", href: "/collector-cards?subCategory=NFL" },
                { title: "AFL", href: "/collector-cards?subCategory=AFL" },
                { title: "Soccer", href: "/collector-cards?subCategory=Soccer" },
                { title: "F1", href: "/collector-cards?subCategory=F1" },
                { title: "Fantasy", href: "/collector-cards?subCategory=Fantasy" },
              ].map((item) => (
                <ListItem key={item.title} title={item.title} href={item.href} />
              ))}
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuTrigger>Coins</NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="grid gap-3 p-4 md:w-[400px] lg:w-[500px] lg:grid-cols-[.75fr_1fr] bg-white dark:bg-slate-900">
              <li className="row-span-3">
                <NavigationMenuLink asChild>
                  <Link
                    className="flex h-full w-full select-none flex-col justify-end rounded-md bg-gradient-to-b from-muted to-muted/50 p-6 no-underline outline-none focus:shadow-md"
                    href="/coins"
                  >
                    <div className="mb-2 mt-4 text-lg font-medium">
                      All Coins
                    </div>
                    <p className="text-sm leading-tight text-muted-foreground">
                      Rare Australian and international currency.
                    </p>
                  </Link>
                </NavigationMenuLink>
              </li>
              {[
                { title: "$2 Coins", href: "/coins?subCategory=$2" },
                { title: "$1 Coins", href: "/coins?subCategory=$1" },
                { title: "50c Coins", href: "/coins?subCategory=50c" },
              ].map((item) => (
                <ListItem key={item.title} title={item.title} href={item.href} />
              ))}
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
                WTB
              </Link>
            </NavigationMenuLink>
          </NavigationMenuItem>
        )}

        {features.consignment && (
          <NavigationMenuItem>
            <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
              <Link href="/consign">
                Consign
              </Link>
            </NavigationMenuLink>
          </NavigationMenuItem>
        )}
        <NavigationMenuItem>
          <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
            <Link href="/dealsafe">
              DealSafe
            </Link>
          </NavigationMenuLink>
        </NavigationMenuItem>

        {user && (
          <NavigationMenuItem>
            <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
              <Link href="/research">
                Research
              </Link>
            </NavigationMenuLink>
          </NavigationMenuItem>
        )}
      </NavigationMenuList>
    </NavigationMenu>
  );
}

const ListItem = React.forwardRef<
  React.ElementRef<"a">,
  React.ComponentPropsWithoutRef<"a">
>(({ className, title, children, ...props }, ref) => {
  return (
    <li>
      <NavigationMenuLink asChild>
        <a
          ref={ref}
          className={cn(
            "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
            className
          )}
          {...props}
        >
          <div className="text-sm font-medium leading-none">{title}</div>
          <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
            {children}
          </p>
        </a>
      </NavigationMenuLink>
    </li>
  )
})
ListItem.displayName = "ListItem"
