
'use client';

import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { ReactNode } from 'react';

export default function MessagesLayout({ children }: { children: ReactNode }) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  if (isUserLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin" />
      </div>
    );
  }

  if (!user) {
    router.push('/sign-in?redirect=/messages');
    return (
      <div className="flex h-screen items-center justify-center">
        <p>Redirecting to sign-in...</p>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-65px)] w-full flex bg-background border-t">
      {children}
    </div>
  );
}
