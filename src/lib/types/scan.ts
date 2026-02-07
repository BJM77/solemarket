// Scan-related TypeScript interfaces

export interface ScannedCard {
    id: string;
    name: string;
    confidence: number;
    estimatedValue: number;
    action: 'grade' | 'keep' | 'bulk';
    boundingBox: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    thumbnailUrl?: string;
    set?: string;
    cardNumber?: string;
    condition?: string;
    rarity?: string;
}

export interface ScanResult {
    id: string;
    userId: string;
    createdAt: Date;
    imageUrl: string;
    cards: ScannedCard[];
    totalValue: number;
    totalCards: number;
    status: 'scanned' | 'listed' | 'archived';
    processingTime?: number;
}

export interface GridDetectionResult {
    rows: number;
    cols: number;
    cards: {
        x: number;
        y: number;
        width: number;
        height: number;
    }[];
}

export interface CardMatchResult {
    name: string;
    confidence: number;
    matchedProduct?: {
        id: string;
        title: string;
        price: number;
        category: string;
    };
}
