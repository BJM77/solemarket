import { ensureActionAuth } from '@/lib/action-utils';
import { logAIUsage, type AIUsageType } from '@/services/ai-usage';
import { withRetry } from './utils/retry';

export interface WorkflowOptions {
    feature: string;
    usageType: AIUsageType;
    maxRetries?: number;
    requireAuth?: boolean;
}

export interface WorkflowResult<T> {
    data?: T;
    error?: string;
    telemetry?: {
        latencyMs: number;
        status: 'success' | 'error';
    };
}

/**
 * A unified engine to execute AI workflows with standardized:
 * 1. Authorization (via ensureActionAuth)
 * 2. Performance Tracking (latency)
 * 3. Robust Error Handling & Retries
 * 4. Structured Telemetry Logging
 */
export async function runAIWorkflow<T>(
    input: { idToken?: string; [key: string]: any },
    promptFn: (input: any) => Promise<T>,
    options: WorkflowOptions
): Promise<WorkflowResult<T>> {
    const startTime = Date.now();
    let userId = 'system';

    try {
        // 1. Authorization check
        if (options.requireAuth !== false) {
            const auth = await ensureActionAuth(input.idToken);
            userId = auth.uid;
        }

        // 2. Execute Prompt with Retries
        const result = await withRetry(
            async () => await promptFn(input),
            {
                maxRetries: options.maxRetries || 2,
                onRetry: (err, attempt) => console.log(`[AI Workflow] ${options.feature} retrying (Attempt ${attempt})...`)
            }
        );

        const latencyMs = Date.now() - startTime;

        // 3. Log Success Telemetry
        // We attempt to extract the number of fields found if the result is an object
        const fieldsFound = result && typeof result === 'object' ? Object.keys(result).filter(k => !!(result as any)[k]).length : 1;
        
        await logAIUsage(
            options.feature,
            options.usageType,
            userId,
            1,
            { fieldsFound },
            latencyMs,
            'success'
        );

        return {
            data: result,
            telemetry: { latencyMs, status: 'success' }
        };

    } catch (error: any) {
        const latencyMs = Date.now() - startTime;
        
        // 4. Log Failure Telemetry
        await logAIUsage(
            options.feature,
            options.usageType,
            userId,
            1,
            { error: error.message },
            latencyMs,
            'error'
        );

        console.error(`[AI Workflow Error] ${options.feature}:`, error);

        return {
            error: error.message || 'An unexpected AI error occurred.',
            telemetry: { latencyMs, status: 'error' }
        };
    }
}
