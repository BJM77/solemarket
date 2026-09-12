import { firestoreDb } from '@/lib/firebase/admin';
import { ActivityLog } from '@/lib/types';
import { headers } from 'next/headers';

/**
 * Logs a system or user activity to Firestore for auditing purposes.
 * This is an "Enterprise-grade" safety measure to track all deletions and updates.
 */
export async function logActivity(
    activity: Omit<ActivityLog, 'timestamp' | 'ipAddress' | 'userAgent'>
) {
    try {
        const headerList = await headers();
        const ip = headerList.get('x-forwarded-for') || 'unknown';
        const userAgent = headerList.get('user-agent') || 'unknown';

        const logEntry: ActivityLog = {
            ...activity,
            timestamp: new Date(),
            ipAddress: ip,
            userAgent: userAgent
        };

        await firestoreDb.collection('activity_logs').add(logEntry);
        console.log(`[ActivityLog] ${activity.action} on ${activity.resourceType}:${activity.resourceId} logged.`);
    } catch (error) {
        // We don't want to fail the main operation if logging fails, 
        // but we definitely want to know about it in server logs.
        console.error('CRITICAL: Failed to write activity log:', error);
    }
}
