import { NextResponse } from 'next/server';

/**
 * centralized security utilities for hardening the platform.
 */

export const IS_PROD = process.env.NODE_ENV === 'production';
export const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '';
export const IS_STRICT_PROD = IS_PROD || PROJECT_ID.includes('-prod');

/**
 * Blocks execution if in a production environment.
 * Used for dev-only routes like seeding and claim elevation.
 */
export function enforceDevOnly() {
    if (IS_STRICT_PROD) {
        return NextResponse.json(
            { error: 'Forbidden: This action is disabled in production environments for safety.' },
            { status: 403 }
        );
    }
    return null;
}

/**
 * Verifies if a token provided for a quick action is still valid.
 * Checks for:
 * 1. Matching token string
 * 2. Expiry (e.g., 7 days)
 * 3. Existence on the document
 */
export function isQuickActionTokenValid(
    storedToken: string | undefined,
    providedToken: string,
    updatedAt?: any // Firestore Timestamp
) {
    if (!storedToken || storedToken !== providedToken) {
        return false;
    }

    if (updatedAt) {
        const lastUpdate = updatedAt.toDate ? updatedAt.toDate() : new Date(updatedAt);
        const now = new Date();
        const diffDays = (now.getTime() - lastUpdate.getTime()) / (1000 * 3600 * 24);
        
        // Links expire after 7 days for security
        if (diffDays > 7) {
            return false;
        }
    }

    return true;
}
