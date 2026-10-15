/** Price verification ("Price Check") types. */
export type CompKind = 'sold' | 'active' | 'market';
export type CompSource = 'benched' | 'ebay' | 'pokemontcg' | 'pricecharting';

export interface Comp {
    source: CompSource;
    kind: CompKind;
    title: string;
    /** AUD, converted if needed. */
    price: number;
    originalPrice?: number;
    originalCurrency?: string;
    url?: string;
    date?: string; // ISO
    condition?: string;
    variant?: string;
}

export interface PriceQuery {
    query: string;
    category?: string;
    condition?: string;
    /** Ignore this listing in internal comps (checking its own price). */
    excludeProductId?: string;
}

export interface ProviderResult {
    source: CompSource;
    ok: boolean;
    /** e.g. "not configured: add EBAY_CLIENT_ID" */
    note?: string;
    comps: Comp[];
}

export interface PriceSuggestion {
    query: string;
    low: number | null;
    median: number | null;
    high: number | null;
    /** Number of comps used after outlier removal. */
    sampleSize: number;
    confidence: 'none' | 'low' | 'medium' | 'high';
    comps: Comp[];
    providers: { source: CompSource; ok: boolean; note?: string; count: number }[];
    generatedAt: string;
    cached?: boolean;
}

export type ListingFlag = 'below_market' | 'above_market' | 'ok' | 'unknown';
