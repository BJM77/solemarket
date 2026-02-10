

"use client";

import Link from 'next/link';
import { useUser, useDoc, useMemoFirebase } from '@/firebase';
import { signOutUser } from '@/lib/firebase/auth';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
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
import { Shield, Zap } from 'lucide-react';
import { doc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { UserProfile } from '@/lib/types';
import { useUserPermissions } from '@/hooks/use-user-permissions';
import { SUPER_ADMIN_EMAILS, SUPER_ADMIN_UIDS } from '@/lib/constants';


export function UserNav() {
  const { user, isUserLoading } = useUser();
  const { canSell, isSuperAdmin: isClaimSuperAdmin, isLoading: permissionsLoading } = useUserPermissions();
  const isSuperAdmin = isClaimSuperAdmin || (user?.uid && SUPER_ADMIN_UIDS.includes(user.uid)) || (user?.email && SUPER_ADMIN_EMAILS.includes(user.email));
  const router = useRouter();
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



  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <Avatar className="h-10 w-10">
            <AvatarImage src={user.photoURL || ''} alt={user.displayName || 'User'} />
            <AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.displayName || 'User'}</p>
            <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {isSuperAdmin && (
          <>
            <DropdownMenuItem asChild className="focus:text-primary cursor-pointer w-full">
              <Link href="/admin">
                <Shield className="mr-2 h-4 w-4" />
                <span>Admin Dashboard</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="focus:text-primary cursor-pointer w-full">
              <Link href="/admin/power-tools">
                <Zap className="mr-2 h-4 w-4" />
                <span>Power Tools</span>
              </Link>
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuGroup>
          <DropdownMenuItem asChild className="focus:text-primary cursor-pointer w-full">
            <Link href="/profile">Profile</Link>
          </DropdownMenuItem>
          {canSell && (
            <DropdownMenuItem asChild className="focus:text-primary cursor-pointer w-full">
              <Link href="/sell/dashboard">Seller Dashboard</Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem asChild className="focus:text-primary cursor-pointer w-full">
            <Link href="/profile/favorites">My Favorites</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className="focus:text-primary cursor-pointer w-full">
            <Link href="/profile/orders">My Purchases</Link>
          </DropdownMenuItem>
          {canSell && (
            <DropdownMenuItem asChild className="focus:text-primary cursor-pointer w-full">
              <Link href="/profile/listings">My Listings</Link>
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        {canSell && (
          <DropdownMenuItem asChild className="focus:text-primary cursor-pointer w-full">
            <Link href="/sell/create">Sell Item</Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} className="focus:text-primary cursor-pointer w-full">
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
