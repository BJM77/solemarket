// Research/Card Scanner Types

export interface Player {
    name: string;
    sport: string;
    prizmRookieYear?: number;
}

export interface ScanHistoryItem {
    id: string;
    name: string;
    isKeeper: boolean;
    isPrizmRookie?: boolean;
    brand?: string;
    cardType?: string;
    sport?: string;
    cardYear?: number | null;
    salesData?: {
        averagePrice?: number | null;
        salesCount?: number | null;
        source?: string | null;
    };
    timestamp: Date;
    imageDataUri?: string;
}
