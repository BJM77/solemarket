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


import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase/config';
import { collection, query, orderBy } from 'firebase/firestore';
import { useCollection, useMemoFirebase } from '@/firebase';

export function MainNavLinks() {
  const { user } = useUser();
  const router = useRouter();

  // Fetch categories for dynamic navigation
  // Use 'name' for sorting to ensure all categories show (some might lack 'order' field)
  const categoriesQuery = useMemoFirebase(() => query(collection(db, 'categories'), orderBy('name', 'asc')), []);
  const { data: categories } = useCollection(categoriesQuery);

  return (
    <NavigationMenu>
      <NavigationMenuList>


        <NavigationMenuItem>
          <NavigationMenuTrigger onClick={() => router.push('/browse')}>Explore</NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="w-60 p-2">
              <ListItem title="All Listings" href="/browse" className="font-bold bg-muted/50" />
              <div className="my-2 border-t" />

              {categories && categories.length > 0 ? (
                categories
                  .filter((c: any) => c.showInNav !== false)
                  .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
                  .map((cat: any) => (
                    <ListItem key={cat.id} title={cat.name} href={cat.href || '#'} />
                  ))
              ) : (
                <div className="p-2 text-sm text-muted-foreground">No categories found</div>
              )}

              <div className="my-2 border-t" />
              <ListItem title="Multilisting Deals" href="/multilisting-deals" />
            </ul>
          </NavigationMenuContent>
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

        {user && (
          <NavigationMenuItem>
            <NavigationMenuTrigger>Tools</NavigationMenuTrigger>
            <NavigationMenuContent>
              <ul className="w-48 p-2">
                <ListItem title="Scan Cards" href="/scan" />
                <ListItem title="AI Card Grader" href="/tools/grader" />
                <ListItem title="Research" href="/research" />
              </ul>
            </NavigationMenuContent>
          </NavigationMenuItem>
        )}

        <NavigationMenuItem>
          <NavigationMenuTrigger>Services</NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="w-48 p-2">
              {features.consignment && (
                <ListItem title="Consign" href="/consign" />
              )}
              <ListItem title="DealSafe" href="/dealsafe" />
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>

      </NavigationMenuList>
    </NavigationMenu >
  );
}

const ListItem = React.forwardRef<
  React.ElementRef<"a">,
  React.ComponentPropsWithoutRef<"a"> & { title: string; href: string }
>(({ className, title, href, ...props }, ref) => {
  return (
    <li>
      <NavigationMenuLink asChild>
        <Link
          ref={ref}
          href={href}
          className={cn(
            "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
            className
          )}
          {...props}
        >
          <div className="text-sm font-medium leading-none">{title}</div>
        </Link>
      </NavigationMenuLink>
    </li>
  );
});
ListItem.displayName = "ListItem";
