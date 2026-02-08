/**
 * Priget - Price Intelligence Types
 */

import { Timestamp } from 'firebase/firestore';

export interface MarketData {
    lastCheckedAt: Timestamp;
    averageSoldPrice: number;
    lastSoldDate: string; // ISO Date
    suggestedPrice: number;
    ebayLink?: string;
    sampleSize: number; // Number of sold items analyzed
}

export interface EbaySearchResult {
    title: string;
    price: number;
    soldDate: string;
    link: string;
    condition?: string;
}

export interface PriceFlag {
    status: 'overpriced' | 'underpriced' | 'competitive' | 'unknown';
    percentage: number; // Difference percentage
}

export interface PrigetProduct {
    id: string;
    title: string;
    currentPrice: number;
    marketData?: MarketData;
    priceFlag?: PriceFlag;
    imageUrl?: string;
}

export interface BatchProcessResult {
    productId: string;
    success: boolean;
    marketData?: MarketData;
    error?: string;
}
