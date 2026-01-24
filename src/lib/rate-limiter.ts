// Rate limiting utility for AI flows
// Prevents API quota exhaustion and abuse

interface RateLimitConfig {
    maxRequests: number;
    windowMs: number;
}

class RateLimiter {
    private requestLog: Map<string, number[]> = new Map();

    constructor(private config: RateLimitConfig) { }

    /**
     * Check if request is allowed under rate limit
     * @param userId - User identifier
     * @returns true if allowed, false if rate limited
     */
    checkLimit(userId: string): boolean {
        const now = Date.now();
        const userRequests = this.requestLog.get(userId) || [];

        // Filter out requests outside the time window
        const recentRequests = userRequests.filter(
            timestamp => now - timestamp < this.config.windowMs
        );

        // Check if limit exceeded
        if (recentRequests.length >= this.config.maxRequests) {
            return false;
        }

        // Add current request
        recentRequests.push(now);
        this.requestLog.set(userId, recentRequests);

        // Cleanup old entries periodically (every 100 requests)
        if (this.requestLog.size > 100) {
            this.cleanup(now);
        }

        return true;
    }

    /**
     * Get time until next allowed request
     * @param userId - User identifier
     * @returns milliseconds until next request allowed, or 0 if allowed now
     */
    getRetryAfter(userId: string): number {
        const userRequests = this.requestLog.get(userId) || [];
        if (userRequests.length === 0) return 0;

        const oldestRequest = userRequests[0];
        const resetTime = oldestRequest + this.config.windowMs;
        const now = Date.now();

        return Math.max(0, resetTime - now);
    }

    private cleanup(now: number) {
        for (const [userId, requests] of this.requestLog.entries()) {
            const recentRequests = requests.filter(
                timestamp => now - timestamp < this.config.windowMs
            );

            if (recentRequests.length === 0) {
                this.requestLog.delete(userId);
            } else {
                this.requestLog.set(userId, recentRequests);
            }
        }
    }
}

// AI flow rate limiter: 10 requests per minute per user
export const aiRateLimiter = new RateLimiter({
    maxRequests: 10,
    windowMs: 60 * 1000, // 1 minute
});

// Utility function for AI flows
export function checkAIRateLimit(userId: string): void {
    if (!aiRateLimiter.checkLimit(userId)) {
        const retryAfter = Math.ceil(aiRateLimiter.getRetryAfter(userId) / 1000);
        throw new Error(
            `Rate limit exceeded. Please wait ${retryAfter} seconds before trying again.`
        );
    }
}
