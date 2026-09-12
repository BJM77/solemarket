
/**
 * Generic retry wrapper with exponential backoff for AI calls.
 * This is crucial for handling 503 (Service Unavailable) and 429 (Rate Limit) errors
 * during spikes in demand on the Gemini API.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: { 
    maxRetries?: number; 
    delayMs?: number; 
    onRetry?: (error: any, attempt: number) => void 
  } = {}
): Promise<T> {
  const { maxRetries = 3, delayMs = 1500, onRetry } = opts;
  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      const isRetryable = 
        error.message?.includes('503') || 
        error.message?.includes('429') || 
        error.message?.toLowerCase().includes('overloaded') || 
        error.message?.toLowerCase().includes('demand');

      if (!isRetryable || attempt === maxRetries) {
        throw error;
      }

      if (onRetry) onRetry(error, attempt);
      
      // Exponential backoff
      const waitTime = delayMs * Math.pow(2, attempt - 1);
      console.log(`[withRetry] Attempt ${attempt} failed. Retrying in ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  throw lastError;
}
