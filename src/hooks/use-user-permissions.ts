
'use client';

import { useUser, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import type { UserProfile } from '@/lib/types';

interface UserPermissions {
    isSuperAdmin: boolean;
    isAdmin: boolean;
    canSell: boolean;
    isLoading: boolean;
    userProfile: UserProfile | null;
}

/**
 * A hook to get detailed permissions for the current user.
 * It checks the user's role and selling capabilities from their custom claims and Firestore profile.
 * @returns {UserPermissions} An object with boolean flags for permissions and loading state.
 */
export function useUserPermissions(): UserPermissions {
    const { user, isUserLoading: isAuthLoading } = useUser();

    // Memoize the document reference to prevent re-renders
    const userProfileRef = useMemoFirebase(() => {
        if (!user?.uid) return null;
        return doc(db, 'users', user.uid);
    }, [user?.uid]);

    // useDoc will fetch the user's profile from Firestore
    const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

    const isLoading = isAuthLoading || isProfileLoading;

    if (isAuthLoading || !user) {
        return {
            isSuperAdmin: false,
            isAdmin: false,
            canSell: false,
            isLoading,
            userProfile: null,
        };
    }

    const role = user?.role || userProfile?.role;
    const isSuperAdmin = role === 'superadmin';
    const isAdmin = role === 'admin' || role === 'superadmin';
    const canSell = role === 'superadmin' || role === 'admin' || userProfile?.canSell === true;

    return {
        isSuperAdmin,
        isAdmin,
        canSell,
        isLoading,
        userProfile: userProfile || null,
    };
}
