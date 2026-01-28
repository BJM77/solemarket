'use client';

import { useUser, useDoc, useMemoFirebase } from '@/firebase';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { doc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import type { UserProfile } from '@/lib/types';
import AdminSidebar from '@/components/layout/AdminSidebar';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { useUserPermissions } from '@/hooks/use-user-permissions';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isUserLoading: isAuthLoading } = useUser();
  const { isSuperAdmin, isLoading: isPermissionsLoading } = useUserPermissions();
  const router = useRouter();
  const pathname = usePathname();

  const isUserLoading = isAuthLoading || isPermissionsLoading;

  useEffect(() => {
    const checkAdmin = async () => {
      if (!isUserLoading) {
        if (!isSuperAdmin) {
          router.replace('/');
        }
      }
    };
    checkAdmin();
  }, [user, isUserLoading, router, isSuperAdmin]);

  if (isUserLoading || !isSuperAdmin) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Verifying administrative access...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <div className="flex flex-col flex-1">
        <header className="flex h-16 items-center justify-end border-b bg-background px-4">
          <NotificationBell />
        </header>
        <main key={pathname} className="flex-1 p-4 sm:p-6 lg:p-8 bg-muted/20">
          {children}
        </main>
      </div>
    </div>
  );
}
