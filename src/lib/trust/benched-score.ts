/**
 * Calculates the Benched Trust Score (0-100) for a seller.
 * 
 * Weights:
 * - Verification Level (max 25)
 * - Sales History (max 25)
 * - Review Quality (max 20)
 * - Response Time (max 15)
 * - Dispute Rate (max 10)
 * - Account Age (max 5)
 */

export interface SellerTrustMetrics {
    // Verifications (booleans)
    emailVerified: boolean;
    phoneVerified: boolean;
    idVerified: boolean;
    vaultOnboarded: boolean;

    // Sales Data
    totalSalesCount: number;
    totalSalesVolumeDollars: number;

    // Reviews
    averageRating: number; // 0-5
    reviewCount: number;

    // Engagement
    medianResponseTimeHours: number;

    // Disputes
    totalDisputesAgainst: number;
    totalDisputesLost: number;

    // Account Age
    createdAt: Date;
}

export function calculateBenchedScore(metrics: SellerTrustMetrics): number {
    let score = 0;

    // 1. Verification Level (25 pts max)
    if (metrics.emailVerified) score += 2;
    if (metrics.phoneVerified) score += 5;
    if (metrics.idVerified) score += 8;
    if (metrics.vaultOnboarded) score += 10;

    // 2. Sales History (25 pts max)
    // - Up to 15 pts for count (1 pt per 2 sales)
    const countScore = Math.min(15, Math.floor(metrics.totalSalesCount / 2));
    // - Up to 10 pts for volume (1 pt per $500)
    const volumeScore = Math.min(10, Math.floor(metrics.totalSalesVolumeDollars / 500));
    score += (countScore + volumeScore);

    // 3. Review Quality (20 pts max)
    // - Requires at least 3 reviews to start earning points here
    if (metrics.reviewCount >= 3) {
        // Base points for average rating (e.g. 5.0 = 15 pts, 4.0 = 12 pts)
        const ratingScore = Math.max(0, (metrics.averageRating / 5) * 15);
        // Bonus for having more reviews (up to 5 pts)
        const reviewVolumeBonus = Math.min(5, Math.floor(metrics.reviewCount / 5));
        score += (ratingScore + reviewVolumeBonus);
    }

    // 4. Response Time (15 pts max)
    // - Under 1 hour = 15 pts
    // - Under 6 hours = 10 pts
    // - Under 24 hours = 5 pts
    if (metrics.medianResponseTimeHours <= 1) {
        score += 15;
    } else if (metrics.medianResponseTimeHours <= 6) {
        score += 10;
    } else if (metrics.medianResponseTimeHours <= 24) {
        score += 5;
    }

    // 5. Dispute Rate (10 pts max)
    // - 0 disputes = 10 pts
    // - 1 dispute lost = -10 pts to total score (punitive)
    // - 2+ disputes lost = -30 pts to total score (highly punitive)
    if (metrics.totalDisputesAgainst === 0) {
        score += 10;
    } else if (metrics.totalDisputesLost === 0) {
        // Disputed but won (frivolous buyer) -> still get partial points
        score += 5;
    } else if (metrics.totalDisputesLost === 1) {
        score -= 10; 
    } else if (metrics.totalDisputesLost >= 2) {
        score -= 30;
    }

    // 6. Account Age (5 pts max)
    const now = new Date();
    const monthsOld = (now.getTime() - metrics.createdAt.getTime()) / (1000 * 60 * 60 * 24 * 30);
    // 1 pt per 3 months
    const ageScore = Math.min(5, Math.floor(monthsOld / 3));
    score += ageScore;

    // Floor and Ceiling bounds (0 - 100)
    return Math.max(0, Math.min(100, Math.round(score)));
}

export function getTrustTier(score: number): 'Bronze' | 'Silver' | 'Gold' | 'Guaranteed Trust' | 'Unrated' {
    if (score >= 95) return 'Guaranteed Trust';
    if (score >= 80) return 'Gold';
    if (score >= 60) return 'Silver';
    if (score >= 40) return 'Bronze';
    return 'Unrated';
}
