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
    // Pokemon - The "Big Three" & Absolute Top Tier
    { name: 'Charizard', sport: 'Pokemon' },
    { name: 'Pikachu', sport: 'Pokemon' },
    { name: 'Umbreon', sport: 'Pokemon' },
    { name: 'Rayquaza', sport: 'Pokemon' },
    { name: 'Lugia', sport: 'Pokemon' },
    // Gen 1 Favorites & Starters
    { name: 'Blastoise', sport: 'Pokemon' },
    { name: 'Venusaur', sport: 'Pokemon' },
    { name: 'Mewtwo', sport: 'Pokemon' },
    { name: 'Mew', sport: 'Pokemon' },
    { name: 'Gengar', sport: 'Pokemon' },
    { name: 'Arcanine', sport: 'Pokemon' },
    { name: 'Dragonite', sport: 'Pokemon' },
    { name: 'Eevee', sport: 'Pokemon' },
    { name: 'Gyarados', sport: 'Pokemon' },
    { name: 'Alakazam', sport: 'Pokemon' },
    { name: 'Machamp', sport: 'Pokemon' },
    { name: 'Snorlax', sport: 'Pokemon' },
    { name: 'Dragonair', sport: 'Pokemon' },
    // Popular "Eeeveelutions" & Gen 2
    { name: 'Espeon', sport: 'Pokemon' },
    { name: 'Sylveon', sport: 'Pokemon' },
    { name: 'Vaporeon', sport: 'Pokemon' },
    { name: 'Flareon', sport: 'Pokemon' },
    { name: 'Jolteon', sport: 'Pokemon' },
    { name: 'Leafeon', sport: 'Pokemon' },
    { name: 'Glaceon', sport: 'Pokemon' },
    { name: 'Tyranitar', sport: 'Pokemon' },
    { name: 'Celebi', sport: 'Pokemon' },
    // Legendary & Mythical Pokemon
    { name: 'Giratina', sport: 'Pokemon' },
    { name: 'Latias', sport: 'Pokemon' },
    { name: 'Latios', sport: 'Pokemon' },
    { name: 'Kyogre', sport: 'Pokemon' },
    { name: 'Groudon', sport: 'Pokemon' },
    { name: 'Deoxys', sport: 'Pokemon' },
    { name: 'Darkrai', sport: 'Pokemon' },
    { name: 'Arceus', sport: 'Pokemon' },
    { name: 'Dialga', sport: 'Pokemon' },
    { name: 'Palkia', sport: 'Pokemon' },
    { name: 'Ho-Oh', sport: 'Pokemon' },
    // Modern & Fan-Favorite Collectibles
    { name: 'Greninja', sport: 'Pokemon' },
    { name: 'Lucario', sport: 'Pokemon' },
    { name: 'Gardevoir', sport: 'Pokemon' },
    { name: 'Mimikyu', sport: 'Pokemon' },
    { name: 'Zoroark', sport: 'Pokemon' },
    { name: 'Garchomp', sport: 'Pokemon' },
    { name: 'Metagross', sport: 'Pokemon' },
    { name: 'Hydreigon', sport: 'Pokemon' },
    { name: 'Togepi', sport: 'Pokemon' },
    { name: 'Scizor', sport: 'Pokemon' },
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
