
'use client';

import { useFirebase, useUser } from '@/firebase';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Heart, ShoppingBag, Loader2, User as UserIcon, DollarSign } from 'lucide-react';
import { useEffect } from 'react';
import { cn } from '@/lib/utils';

const getInitials = (name?: string | null) => {
  if (!name) return 'U';
  const names = name.split(' ');
  if (names.length > 1) {
    return names[0][0] + names[names.length - 1][0];
  }
  return name[0];
};

function ProfileSkeleton() {
  return (
    <div className="container py-8 md:py-12">
      <div className="grid gap-10 lg:grid-cols-4">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader className="flex flex-col items-center text-center p-6">
              <Skeleton className="h-24 w-24 rounded-full mb-4" />
              <Skeleton className="h-8 w-3/4 mb-2" />
              <Skeleton className="h-4 w-full" />
            </CardHeader>
          </Card>
        </div>
        <div className="lg:col-span-3">
          <div className="mb-6">
            <Skeleton className="h-10 w-64" />
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    </div>
  );
}

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/sign-in?redirect=/profile');
    }
  }, [isUserLoading, user, router]);

  const getCurrentTab = () => {
    if (pathname.includes('/favorites')) return 'favorites';
    if (pathname.includes('/listings')) return 'listings';
    if (pathname.includes('/offers')) return 'offers';
    return 'profile';
  }

  if (isUserLoading) {
    return <ProfileSkeleton />;
  }

  if (!user) {
    return <ProfileSkeleton />; // Show skeleton while redirecting
  }

  return (
    <div className="container py-8 md:py-12">
      <div className="grid gap-10 lg:grid-cols-4 items-start">
        {/* Left Sidebar */}
        <aside className="lg:col-span-1 lg:sticky lg:top-24">
          <Card>
            <CardHeader className="flex flex-col items-center text-center p-6">
              <Avatar className="h-24 w-24 mb-4">
                <AvatarImage
                  src={user?.photoURL || ''}
                  alt={user?.displayName || 'User'}
                />
                <AvatarFallback className="text-3xl">
                  {getInitials(user?.displayName)}
                </AvatarFallback>
              </Avatar>
              <CardTitle className="text-2xl">{user?.displayName}</CardTitle>
              <p className="text-muted-foreground">{user?.email}</p>
            </CardHeader>
          </Card>
        </aside>

        {/* Right Content */}
        <main className="lg:col-span-3">
          <Tabs value={getCurrentTab()} className="w-full">
            <TabsList className="grid w-full grid-cols-4 max-w-lg mb-6">
              <TabsTrigger value="profile" asChild>
                <Link href="/profile"><UserIcon className="w-4 h-4 mr-2" />Profile</Link>
              </TabsTrigger>
              <TabsTrigger value="listings" asChild>
                <Link href="/profile/listings"><ShoppingBag className="w-4 h-4 mr-2" />My Listings</Link>
              </TabsTrigger>
              <TabsTrigger value="offers" asChild>
                <Link href="/profile/offers"><DollarSign className="w-4 h-4 mr-2" />Offers</Link>
              </TabsTrigger>
              <TabsTrigger value="favorites" asChild>
                <Link href="/profile/favorites"><Heart className="w-4 h-4 mr-2" />Favorites</Link>
              </TabsTrigger>
            </TabsList>
            {/* The active page content will be rendered here */}
            {children}
          </Tabs>
        </main>
      </div>
    </div>
  );
}
