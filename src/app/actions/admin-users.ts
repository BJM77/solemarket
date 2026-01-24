
'use server';

import * as admin from 'firebase-admin';
import { UserRecord } from 'firebase-admin/auth';
import { firestoreDb } from '@/lib/firebase/admin';
import { verifyIdToken } from '@/lib/firebase/auth-admin';
import type { UserProfile, UserRole } from '@/lib/types';
import { revalidatePath } from 'next/cache';

// Initialize admin SDK if not already done
if (!admin.apps.length) {
    try {
        admin.initializeApp();
    } catch (e) { console.error('Firebase admin initialization error', e); }
}

export type ActionResponse = {
    success: boolean;
    message: string;
};

export interface AdminUser extends UserProfile {
    uid: string;
    disabled: boolean;
    lastSignInTime?: string;
}

const mapUserRecordToAdminUser = (user: UserRecord, profile?: UserProfile): AdminUser => ({
    uid: user.uid,
    id: user.uid,
    displayName: user.displayName || profile?.displayName || 'N/A',
    email: user.email || 'N/A',
    photoURL: user.photoURL || profile?.photoURL,
    role: profile?.role || 'viewer',
    canSell: profile?.canSell || false,
    disabled: user.disabled,
    lastSignInTime: user.metadata.lastSignInTime,
    createdAt: profile?.createdAt,
});

/**
 * Super-admin action to create a new user.
 */
export async function createNewUser(
    idToken: string,
    userData: { email: string; password; displayName: string; role: UserRole; }
): Promise<ActionResponse> {
    try {
        const decodedToken = await verifyIdToken(idToken);
        if (decodedToken.role !== 'superadmin') { // Super admin check
            return { success: false, message: 'Permission denied.' };
        }

        const { email, password, displayName, role } = userData;

        // Create user in Firebase Auth
        const userRecord = await admin.auth().createUser({
            email,
            password,
            displayName,
            emailVerified: true,
        });

        // Create user profile in Firestore
        const profileData: Partial<UserProfile> = {
            displayName,
            email,
            role,
            canSell: ['seller', 'admin', 'superadmin'].includes(role),
            createdAt: new Date() as any, // Firestore admin SDK handles this
        };
        await firestoreDb.collection('users').doc(userRecord.uid).set(profileData);

        revalidatePath('/admin/users');
        return { success: true, message: `User ${displayName} created successfully.` };

    } catch (error: any) {
        console.error('Error creating user:', error);
        return { success: false, message: error.message || 'Failed to create user.' };
    }
}

/**
 * Get all users for the admin panel.
 */
export async function getAllUsers(idToken: string): Promise<{ users?: AdminUser[], error?: string }> {
     try {
        const decodedToken = await verifyIdToken(idToken);
        if (decodedToken.role !== 'superadmin') { // Super admin check
            return { error: 'Permission denied.' };
        }

        const userRecords = await admin.auth().listUsers();
        const uids = userRecords.users.map(u => u.uid);

        if (uids.length === 0) {
            return { users: [] };
        }

        // Fetch all profiles in one go
        const profilesSnap = await firestoreDb.collection('users').where(admin.firestore.FieldPath.documentId(), 'in', uids).get();
        const profilesMap = new Map<string, UserProfile>();
        profilesSnap.forEach(doc => {
            profilesMap.set(doc.id, { id: doc.id, ...doc.data() } as UserProfile);
        });

        const adminUsers: AdminUser[] = userRecords.users.map(user => {
            const profile = profilesMap.get(user.uid);
            return mapUserRecordToAdminUser(user, profile);
        });

        return { users: adminUsers };

    } catch (error: any) {
        console.error('Error fetching users:', error);
        return { error: 'Failed to fetch users.' };
    }
}


/**
 * Update a user's role.
 */
export async function updateUserRole(idToken: string, userId: string, newRole: UserRole): Promise<ActionResponse> {
    try {
        const decodedToken = await verifyIdToken(idToken);
        if (decodedToken.role !== 'superadmin') { // Super admin check
            return { success: false, message: 'Permission denied.' };
        }
        
        const canSell = ['seller', 'admin', 'superadmin'].includes(newRole);

        await firestoreDb.collection('users').doc(userId).update({
            role: newRole,
            canSell: canSell,
        });

        revalidatePath('/admin/users');
        return { success: true, message: "User role updated." };
    } catch (error: any) {
        console.error('Error updating role:', error);
        return { success: false, message: 'Failed to update role.' };
    }
}

/**
 * Toggle a user's ban status.
 */
export async function toggleUserBan(idToken: string, userId: string, currentStatus: 'active' | 'banned'): Promise<ActionResponse> {
    try {
        const decodedToken = await verifyIdToken(idToken);
        if (decodedToken.role !== 'superadmin') {
            return { success: false, message: 'Permission denied.' };
        }
        
        const isDisabled = currentStatus === 'active';
        await admin.auth().updateUser(userId, { disabled: isDisabled });
        
        revalidatePath('/admin/users');
        return { success: true, message: `User has been ${isDisabled ? 'banned' : 'unbanned'}.` };

    } catch (error: any) {
        console.error('Error toggling ban:', error);
        return { success: false, message: 'Failed to update user status.' };
    }
}
