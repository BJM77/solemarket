
import { firestoreDb } from '@/lib/firebase/admin';
import { admin } from '@/lib/firebase/admin';

export type AIUsageType = 'vision_analysis' | 'text_generation' | 'moderation' | 'grading';

export interface AIUsageLog {
    type: AIUsageType;
    model: string;
    units: number; 
    estimatedCost: number; 
    userId?: string;
    feature: string;
    timestamp: any;
    status: 'success' | 'error';
    latencyMs?: number;
    metadata?: Record<string, any>;
}

const COST_ESTIMATES = {
    vision_analysis: 0.002, 
    text_generation: 0.0001,
    moderation: 0.0001,
    grading: 0.002
};

/**
 * Logs AI usage to Firestore for tracking and cost estimation.
 */
export async function logAIUsage(
    feature: string,
    type: AIUsageType,
    userId?: string,
    units: number = 1,
    metadata?: Record<string, any>,
    latencyMs?: number,
    status: 'success' | 'error' = 'success'
) {
    try {
        const estimatedCost = (COST_ESTIMATES[type] || 0.0001) * units;

        await firestoreDb.collection('ai_usage_logs').add({
            feature,
            type,
            userId: userId || 'system',
            units,
            estimatedCost,
            model: 'gemini-1.5-flash',
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            status,
            latencyMs,
            metadata: metadata || {}
        });
    } catch (error) {
        console.error('Failed to log AI usage:', error);
    }
}
