export interface SaleDataPoint {
    id: string;
    price: number;
    soldAt: Date;
    category: 'shoes' | 'cards' | 'coins' | string;
    grade?: string;
    condition?: string;
    isVaultVerified: boolean;
    image?: string;
    title: string;
}

export interface MarketPulseData {
    // Overall metrics (all sales)
    averagePrice: number;
    medianPrice: number;
    volume: number;
    
    // Premium segment (Vault-verified only)
    vaultVerified: {
        averagePrice: number;
        volume: number;
        premiumOverMarket: number; // % above unverified
    };
    
    // Recent notable sales
    recentSales: Array<{
        price: number;
        soldAt: Date;
        isVaultVerified: boolean;
        grade?: string;
        image?: string;
        title: string;
    }>;
}

// Reject obvious outliers before they corrupt the index
export function filterValidSales(sales: SaleDataPoint[], category: string): SaleDataPoint[] {
    const reasonableBounds: Record<string, { min: number; max: number }> = {
        shoes: { min: 30, max: 15000 },
        cards: { min: 5, max: 50000 },
        coins: { min: 10, max: 100000 },
    };
    
    const bounds = reasonableBounds[category] || { min: 1, max: 100000 };
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    // Track seen items by date & title to avoid duplicates (naive approach)
    const seen = new Set<string>();

    return sales.filter(sale => {
        // Rule 1: Price within reasonable bounds
        if (sale.price < bounds.min || sale.price > bounds.max) {
            console.warn(`[Market Pulse] Outlier rejected: $${sale.price} for ${category}`);
            return false;
        }
        
        // Rule 2: Reject sales older than 365 days
        if (sale.soldAt < oneYearAgo) {
            return false;
        }

        // Rule 3: Reject duplicate entries (same title, same day, same price)
        const dateStr = sale.soldAt.toISOString().split('T')[0];
        const dedupeKey = `${sale.title}-${dateStr}-${sale.price}`;
        if (seen.has(dedupeKey)) {
            return false;
        }
        seen.add(dedupeKey);

        return true;
    });
}

// Add statistical outlier detection (IQR method)
export function removeStatisticalOutliers(sales: SaleDataPoint[]): SaleDataPoint[] {
    if (sales.length < 4) return sales; // Need enough data for IQR

    const prices = sales.map(s => s.price).sort((a, b) => a - b);
    const q1 = prices[Math.floor(prices.length * 0.25)];
    const q3 = prices[Math.floor(prices.length * 0.75)];
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;

    return sales.filter(s => s.price >= lowerBound && s.price <= upperBound);
}

// Calculate the average price
function getAverage(sales: SaleDataPoint[]): number {
    if (sales.length === 0) return 0;
    const total = sales.reduce((sum, s) => sum + s.price, 0);
    return Math.round(total / sales.length);
}

// Calculate the median price
function getMedian(sales: SaleDataPoint[]): number {
    if (sales.length === 0) return 0;
    const prices = sales.map(s => s.price).sort((a, b) => a - b);
    const mid = Math.floor(prices.length / 2);
    return prices.length % 2 !== 0 ? prices[mid] : (prices[mid - 1] + prices[mid]) / 2;
}

// Aggregate sales into the MarketPulseData structure
export function aggregateMarketPulse(sales: SaleDataPoint[], category: string): MarketPulseData {
    // 1. Initial cleanup
    let validSales = filterValidSales(sales, category);
    
    // 2. Statistical cleanup
    validSales = removeStatisticalOutliers(validSales);

    // 3. Segment data
    const vaultSales = validSales.filter(s => s.isVaultVerified);
    const unverifiedSales = validSales.filter(s => !s.isVaultVerified);

    const overallAverage = getAverage(validSales);
    const overallMedian = getMedian(validSales);
    
    const vaultAverage = getAverage(vaultSales);
    const unverifiedAverage = getAverage(unverifiedSales);

    // Calculate premium over unverified
    let premiumOverMarket = 0;
    if (unverifiedAverage > 0 && vaultAverage > 0) {
        premiumOverMarket = Math.round(((vaultAverage - unverifiedAverage) / unverifiedAverage) * 100);
    }

    // Recent notable sales (sort by most recent)
    const recentSales = [...validSales]
        .sort((a, b) => b.soldAt.getTime() - a.soldAt.getTime())
        .slice(0, 10)
        .map(s => ({
            price: s.price,
            soldAt: s.soldAt,
            isVaultVerified: s.isVaultVerified,
            grade: s.grade,
            image: s.image,
            title: s.title
        }));

    return {
        averagePrice: overallAverage,
        medianPrice: overallMedian,
        volume: validSales.length,
        vaultVerified: {
            averagePrice: vaultAverage,
            volume: vaultSales.length,
            premiumOverMarket
        },
        recentSales
    };
}
