import { describe, it, expect } from 'vitest';
import { calculateBenchedScore, getTrustTier, SellerTrustMetrics } from './benched-score';

describe('Benched Trust Score', () => {
    it('should calculate a perfect score for a flawless seller', () => {
        const metrics: SellerTrustMetrics = {
            emailVerified: true,
            phoneVerified: true,
            idVerified: true,
            vaultOnboarded: true, // 25 pts
            totalSalesCount: 100, // 15 pts (max)
            totalSalesVolumeDollars: 10000, // 10 pts (max)
            averageRating: 5.0, // 15 pts
            reviewCount: 50, // 5 pts (max)
            medianResponseTimeHours: 0.5, // 15 pts (max)
            totalDisputesAgainst: 0, // 10 pts (max)
            totalDisputesLost: 0,
            createdAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) // 1 year old -> 4 pts
        };

        const score = calculateBenchedScore(metrics);
        expect(score).toBe(99); // 25+15+10+15+5+15+10+4 = 99
        expect(getTrustTier(score)).toBe('Guaranteed Trust');
    });

    it('should severely punish sellers who lose multiple disputes', () => {
        const metrics: SellerTrustMetrics = {
            emailVerified: true,
            phoneVerified: true,
            idVerified: false,
            vaultOnboarded: false, // 7 pts
            totalSalesCount: 20, // 10 pts
            totalSalesVolumeDollars: 2000, // 4 pts
            averageRating: 4.0, // 12 pts
            reviewCount: 10, // 2 pts
            medianResponseTimeHours: 12, // 5 pts
            totalDisputesAgainst: 3,
            totalDisputesLost: 2, // -30 pts punitive
            createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) // 3 months -> 1 pt
        };

        const score = calculateBenchedScore(metrics);
        // 7 + 10 + 4 + 12 + 2 + 5 - 30 + 1 = 11
        expect(score).toBe(11);
        expect(getTrustTier(score)).toBe('Unrated'); // Under 40 is unrated
    });

    it('should ensure the score never exceeds 100 or falls below 0', () => {
        const terribleMetrics: SellerTrustMetrics = {
            emailVerified: false, phoneVerified: false, idVerified: false, vaultOnboarded: false,
            totalSalesCount: 0, totalSalesVolumeDollars: 0, averageRating: 0, reviewCount: 0,
            medianResponseTimeHours: 100, totalDisputesAgainst: 10, totalDisputesLost: 10,
            createdAt: new Date()
        };
        const floorScore = calculateBenchedScore(terribleMetrics);
        expect(floorScore).toBe(0);

        const godlyMetrics: SellerTrustMetrics = {
            emailVerified: true, phoneVerified: true, idVerified: true, vaultOnboarded: true,
            totalSalesCount: 1000, totalSalesVolumeDollars: 1000000, averageRating: 5, reviewCount: 1000,
            medianResponseTimeHours: 0.1, totalDisputesAgainst: 0, totalDisputesLost: 0,
            createdAt: new Date(Date.now() - 10 * 365 * 24 * 60 * 60 * 1000)
        };
        const ceilScore = calculateBenchedScore(godlyMetrics);
        expect(ceilScore).toBe(100);
    });
});
