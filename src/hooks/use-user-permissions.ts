
'use client';

import { useUser, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import type { UserProfile } from '@/lib/types';
import { SUPER_ADMIN_UIDS } from '@/lib/constants';

interface UserPermissions {
    isSuperAdmin: boolean;
    isAdmin: boolean;
    canSell: boolean;
    isLoading: boolean;
    userProfile: UserProfile | null;
}

/**
 * A hook to get detailed permissions for the current user.
 * It checks the user's role and selling capabilities from their Firestore profile.
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

    if (isLoading || !user || !userProfile) {
        return {
            isSuperAdmin: user?.uid ? SUPER_ADMIN_UIDS.includes(user.uid) : false,
            isAdmin: user?.uid ? SUPER_ADMIN_UIDS.includes(user.uid) : false,
            canSell: false,
            isLoading,
            userProfile: userProfile || null,
        };
    }


    const role = userProfile.role;

    return {
        isSuperAdmin: role === 'superadmin' || SUPER_ADMIN_UIDS.includes(user.uid),
        isAdmin: role === 'admin' || role === 'superadmin' || SUPER_ADMIN_UIDS.includes(user.uid),
        canSell: userProfile.canSell === true || role === 'superadmin' || SUPER_ADMIN_UIDS.includes(user.uid),
        isLoading: false,
        userProfile,
    };
}
