"use client";

import { useFirebase } from '@/firebase/provider';
import { User } from 'firebase/auth';

export const useAuth = () => {
  const { user, isUserLoading } = useFirebase();
  // We cast SafeUser to User to satisfy the standalone components that expect it
  return { user: user as unknown as User | null, loading: isUserLoading };
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};
