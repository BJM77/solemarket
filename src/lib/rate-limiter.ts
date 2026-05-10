import { firestoreDb } from './firebase/admin';
import * as admin from 'firebase-admin';

/**
 * Persistent rate limiter using Firestore
 * @param identifier Unique identifier for the user (e.g. UID or IP)
 * @param action Name of the action being rate limited
 * @param limit Maximum number of requests allowed in the window
 * @param windowSeconds Window size in seconds
 * @returns Object with success status and remaining requests
 */
export async function rateLimit(
    identifier: string,
    action: string,
    limit: number,
    windowSeconds: number
): Promise<{ success: boolean; remaining: number; reset: number }> {
    const now = Date.now();
    const windowStart = now - (windowSeconds * 1000);
    const limitId = `${identifier}_${action}`;
    
    const rateLimitRef = firestoreDb.collection('rate_limits').doc(limitId) as admin.firestore.DocumentReference;
    
    try {
        const result = await firestoreDb.runTransaction(async (transaction: admin.firestore.Transaction) => {
            const doc = await transaction.get(rateLimitRef);
            let timestamps: number[] = [];
            
            if (doc.exists) {
                const data = doc.data();
                // Filter out timestamps outside the current window
                timestamps = (data?.timestamps || []).filter((t: number) => t > windowStart);
            }
            
            if (timestamps.length >= limit) {
                const oldestTimestamp = timestamps[0];
                const reset = oldestTimestamp + (windowSeconds * 1000);
                return { success: false, remaining: 0, reset };
            }
            
            timestamps.push(now);
            transaction.set(rateLimitRef, {
                timestamps,
                lastUpdated: admin.firestore.FieldValue.serverTimestamp()
            });
            
            return {
                success: true,
                remaining: limit - timestamps.length,
                reset: now + (windowSeconds * 1000)
            };
        });
        
        return result;
    } catch (error) {
        console.error('Rate limiter error:', error);
        // Fallback to allowing the request if rate limiter fails (fail-open)
        return { success: true, remaining: 1, reset: now + (windowSeconds * 1000) };
    }
}
