import { describe, it, expect } from 'vitest';
import { 
    filterValidSales, 
    removeStatisticalOutliers, 
    aggregateMarketPulse,
    SaleDataPoint 
} from './aggregation';

describe('Market Pulse Aggregation', () => {
    
    it('should filter out sales outside reasonable bounds', () => {
        const sales: SaleDataPoint[] = [
            { id: '1', price: 1, soldAt: new Date(), category: 'shoes', title: 'Jordan', isVaultVerified: false }, // Too low
            { id: '2', price: 200, soldAt: new Date(), category: 'shoes', title: 'Jordan', isVaultVerified: false }, // Valid
            { id: '3', price: 20000, soldAt: new Date(), category: 'shoes', title: 'Jordan', isVaultVerified: false }, // Too high
        ];

        const filtered = filterValidSales(sales, 'shoes');
        expect(filtered.length).toBe(1);
        expect(filtered[0].id).toBe('2');
    });

    it('should filter out duplicate sales', () => {
        const now = new Date();
        const sales: SaleDataPoint[] = [
            { id: '1', price: 200, soldAt: now, category: 'shoes', title: 'Same Shoe', isVaultVerified: false },
            { id: '2', price: 200, soldAt: now, category: 'shoes', title: 'Same Shoe', isVaultVerified: false }, // Duplicate title/date/price
            { id: '3', price: 200, soldAt: now, category: 'shoes', title: 'Different Shoe', isVaultVerified: false }, // Valid
        ];

        const filtered = filterValidSales(sales, 'shoes');
        expect(filtered.length).toBe(2);
    });

    it('should remove statistical outliers using IQR', () => {
        // Need at least 4 items. Let's make a set where 100 is normal, and 1000 is an outlier.
        const sales: SaleDataPoint[] = [
            { id: '1', price: 90, soldAt: new Date(), category: 'shoes', title: 'A', isVaultVerified: false },
            { id: '2', price: 100, soldAt: new Date(), category: 'shoes', title: 'B', isVaultVerified: false },
            { id: '3', price: 110, soldAt: new Date(), category: 'shoes', title: 'C', isVaultVerified: false },
            { id: '4', price: 105, soldAt: new Date(), category: 'shoes', title: 'D', isVaultVerified: false },
            { id: '5', price: 1500, soldAt: new Date(), category: 'shoes', title: 'E', isVaultVerified: false }, // Outlier
        ];

        const noOutliers = removeStatisticalOutliers(sales);
        expect(noOutliers.length).toBe(4);
        expect(noOutliers.find(s => s.id === '5')).toBeUndefined();
    });

    it('should correctly segment Vault sales and calculate premium', () => {
        const sales: SaleDataPoint[] = [
            { id: '1', price: 100, soldAt: new Date(), category: 'shoes', title: 'Unverified 1', isVaultVerified: false },
            { id: '2', price: 120, soldAt: new Date(), category: 'shoes', title: 'Unverified 2', isVaultVerified: false },
            { id: '3', price: 150, soldAt: new Date(), category: 'shoes', title: 'Vault 1', isVaultVerified: true },
            { id: '4', price: 170, soldAt: new Date(), category: 'shoes', title: 'Vault 2', isVaultVerified: true },
        ];

        const data = aggregateMarketPulse(sales, 'shoes');
        
        // Unverified avg = 110, Vault avg = 160.
        // Overall avg = (100 + 120 + 150 + 170) / 4 = 540 / 4 = 135
        
        expect(data.averagePrice).toBe(135);
        expect(data.vaultVerified.averagePrice).toBe(160);
        expect(data.vaultVerified.volume).toBe(2);
        
        // Premium: (160 - 110) / 110 = 50 / 110 = 45.45% -> Math.round -> 45
        expect(data.vaultVerified.premiumOverMarket).toBe(45);
    });
});
