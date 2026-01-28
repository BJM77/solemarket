// Research/Card Scanner Types

export interface Player {
    name: string;
    sport: string;
    prizmRookieYear?: number;
}

export const defaultPlayers: Player[] = [
    { name: 'LeBron James', sport: 'Basketball' },
    { name: 'Michael Jordan', sport: 'Basketball' },
    { name: 'Tom Brady', sport: 'Football' },
    { name: 'Patrick Mahomes', sport: 'Football' },
    { name: 'Mike Trout', sport: 'Baseball' },
    { name: 'Shohei Ohtani', sport: 'Baseball' },
    { name: 'Lionel Messi', sport: 'Soccer' },
    { name: 'Cristiano Ronaldo', sport: 'Soccer' },
];

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
