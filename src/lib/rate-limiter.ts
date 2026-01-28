
export interface RateLimitConfig {
    windowMs: number;
    maxRequests: number;
}

export class RateLimiter {
    private requestLog: Map<string, number[]> = new Map();
    private cleanupInterval: NodeJS.Timeout | null = null;

    constructor(private config: RateLimitConfig) {
        // Automatic cleanup every 5 minutes
        this.cleanupInterval = setInterval(() => {
            this.cleanup(Date.now());
        }, 5 * 60 * 1000);
    }

    /**
     * Check if request is allowed under rate limit
     * @returns true if allowed, false if limit exceeded
     */
    checkLimit(userId: string): boolean {
        const now = Date.now();
        const userRequests = this.requestLog.get(userId) || [];

        const recentRequests = userRequests.filter(
            timestamp => now - timestamp < this.config.windowMs
        );

        if (recentRequests.length >= this.config.maxRequests) {
            return false;
        }

        recentRequests.push(now);
        this.requestLog.set(userId, recentRequests);

        return true;
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

    destroy() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
    }
}
