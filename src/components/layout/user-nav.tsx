

"use client";

import Link from 'next/link';
import { useUser } from '@/firebase';
import { signOutUser } from '@/lib/firebase/auth';
import { useRouter, usePathname } from 'next/navigation';
import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Shield, 
  Zap, 
  User, 
  LayoutDashboard, 
  Heart, 
  ShoppingBag, 
  Tag, 
  PlusCircle, 
  LogOut,
  CreditCard
} from 'lucide-react';
import { useUserPermissions } from '@/hooks/use-user-permissions';
import { SUPER_ADMIN_EMAILS, SUPER_ADMIN_UIDS } from '@/lib/constants';


export function UserNav() {
  const { user, isUserLoading } = useUser();
  const { canSell, isSuperAdmin: isClaimSuperAdmin } = useUserPermissions();
  const isSuperAdmin = isClaimSuperAdmin || (user?.uid && SUPER_ADMIN_UIDS.includes(user.uid)) || (user?.email && SUPER_ADMIN_EMAILS.includes(user.email));
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const handleSignOut = async () => {
    await signOutUser();
    router.push('/');
    router.refresh();
  };

  if (isUserLoading) {
    return <Skeleton className="h-10 w-10 rounded-full" />;
  }

  if (!user) {
    return null;
  }

  const getInitials = (name?: string | null) => {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`;
    }
    return name[0];
  };

  const isActive = (path: string) => pathname === path;

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full focus-visible:ring-offset-0 focus-visible:ring-0">
          <Avatar className="h-10 w-10 border border-border/50">
            <AvatarImage src={user.photoURL || ''} alt={user.displayName || 'User'} className="object-cover" />
            <AvatarFallback className="bg-primary/5 text-primary font-bold">{getInitials(user.displayName)}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64 p-2" align="end" forceMount>
        <DropdownMenuLabel className="font-normal p-2">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-bold leading-none truncate">{user.displayName || 'User'}</p>
            <p className="text-xs leading-none text-muted-foreground truncate">{user.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="my-2" />
        
        {isSuperAdmin && (
          <DropdownMenuGroup>
            <DropdownMenuItem asChild className={cn("cursor-pointer w-full py-2.5 rounded-lg mb-1", isActive('/admin') && "bg-accent text-accent-foreground")}>
              <Link href="/admin" className="flex items-center">
                <Shield className="mr-3 h-4 w-4 text-primary" />
                <span className="font-medium">Admin Dashboard</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className={cn("cursor-pointer w-full py-2.5 rounded-lg", isActive('/admin/power-tools') && "bg-accent text-accent-foreground")}>
              <Link href="/admin/power-tools" className="flex items-center">
                <Zap className="mr-3 h-4 w-4 text-amber-500" />
                <span className="font-medium">Power Tools</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="my-2" />
          </DropdownMenuGroup>
        )}

        <DropdownMenuGroup>
          <DropdownMenuItem asChild className={cn("cursor-pointer w-full py-2.5 rounded-lg mb-1", isActive('/profile') && "bg-accent text-accent-foreground")}>
            <Link href="/profile" className="flex items-center">
              <User className="mr-3 h-4 w-4 text-muted-foreground" />
              <span className="font-medium">My Profile</span>
            </Link>
          </DropdownMenuItem>
          
          {canSell && (
            <DropdownMenuItem asChild className={cn("cursor-pointer w-full py-2.5 rounded-lg mb-1", isActive('/sell/dashboard') && "bg-accent text-accent-foreground")}>
              <Link href="/sell/dashboard" className="flex items-center">
                <LayoutDashboard className="mr-3 h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Seller Dashboard</span>
              </Link>
            </DropdownMenuItem>
          )}
          
          <DropdownMenuItem asChild className={cn("cursor-pointer w-full py-2.5 rounded-lg mb-1", isActive('/profile/favorites') && "bg-accent text-accent-foreground")}>
            <Link href="/profile/favorites" className="flex items-center">
              <Heart className="mr-3 h-4 w-4 text-muted-foreground" />
              <span className="font-medium">My Favorites</span>
            </Link>
          </DropdownMenuItem>
          
          <DropdownMenuItem asChild className={cn("cursor-pointer w-full py-2.5 rounded-lg mb-1", isActive('/profile/orders') && "bg-accent text-accent-foreground")}>
            <Link href="/profile/orders" className="flex items-center">
              <CreditCard className="mr-3 h-4 w-4 text-muted-foreground" />
              <span className="font-medium">My Purchases</span>
            </Link>
          </DropdownMenuItem>
          
          {canSell && (
            <DropdownMenuItem asChild className={cn("cursor-pointer w-full py-2.5 rounded-lg", isActive('/profile/listings') && "bg-accent text-accent-foreground")}>
              <Link href="/profile/listings" className="flex items-center">
                <Tag className="mr-3 h-4 w-4 text-muted-foreground" />
                <span className="font-medium">My Listings</span>
              </Link>
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>
        
        <DropdownMenuSeparator className="my-2" />
        
        {canSell && (
          <DropdownMenuGroup>
            <DropdownMenuItem asChild className={cn("cursor-pointer w-full py-2.5 rounded-lg bg-primary/5 text-primary focus:bg-primary/10 focus:text-primary", isActive('/sell/create') && "bg-primary/10")}>
              <Link href="/sell/create" className="flex items-center">
                <PlusCircle className="mr-3 h-4 w-4" />
                <span className="font-bold">Sell an Item</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="my-2" />
          </DropdownMenuGroup>
        )}
        
        <DropdownMenuItem onClick={handleSignOut} className="focus:text-destructive cursor-pointer w-full py-2.5 rounded-lg text-muted-foreground focus:bg-destructive/5">
          <LogOut className="mr-3 h-4 w-4" />
          <span className="font-medium">Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
