import { getResearchPreferences } from '@/app/actions/research';
import type { Player } from '@/lib/research-types';

export interface CardMatchResult {
    name: string;
    confidence: number;
    estimatedValue: number;
    action: 'grade' | 'keep' | 'bulk';
    matchedPlayer?: Player;
}

/**
 * Match a card name against the user's keep list from research preferences
 */
export async function matchCardName(
    cardName: string,
    userId: string
): Promise<CardMatchResult> {
    // Get user's keep list from research preferences
    const keepList = await getResearchPreferences(userId);

    // Normalize the input
    const normalizedInput = cardName.toLowerCase().trim();

    // Try exact match first
    const exactMatch = keepList.find(
        (player) => player.name.toLowerCase() === normalizedInput
    );

    if (exactMatch) {
        return {
            name: exactMatch.name,
            confidence: 100,
            estimatedValue: estimateValue(exactMatch),
            action: categorizeByValue(estimateValue(exactMatch)),
            matchedPlayer: exactMatch,
        };
    }

    // Try fuzzy matching
    let bestMatch: Player | null = null;
    let bestScore = 0;

    for (const player of keepList) {
        const score = fuzzyMatch(normalizedInput, player.name.toLowerCase());
        if (score > bestScore && score > 0.6) {
            // 60% threshold
            bestScore = score;
            bestMatch = player;
        }
    }

    if (bestMatch) {
        return {
            name: bestMatch.name,
            confidence: Math.round(bestScore * 100),
            estimatedValue: estimateValue(bestMatch),
            action: categorizeByValue(estimateValue(bestMatch)),
            matchedPlayer: bestMatch,
        };
    }

    // No match found - return as bulk
    return {
        name: cardName,
        confidence: 0,
        estimatedValue: 5,
        action: 'bulk',
    };
}

/**
 * Simple fuzzy matching algorithm
 * Returns a score between 0 and 1
 */
function fuzzyMatch(str1: string, str2: string): number {
    // Check if one string contains the other
    if (str1.includes(str2) || str2.includes(str1)) {
        return 0.9;
    }

    // Check for common words
    const words1 = str1.split(/\s+/);
    const words2 = str2.split(/\s+/);

    let matchedWords = 0;
    for (const word1 of words1) {
        for (const word2 of words2) {
            if (word1 === word2 || word1.includes(word2) || word2.includes(word1)) {
                matchedWords++;
                break;
            }
        }
    }

    const totalWords = Math.max(words1.length, words2.length);
    return matchedWords / totalWords;
}

/**
 * Estimate card value based on player and sport
 * This is a simplified estimation - Phase 3 will use real market data
 */
function estimateValue(player: Player): number {
    const sport = player.sport.toLowerCase();

    // High-value players (adjust based on your market knowledge)
    const highValuePlayers = [
        'michael jordan',
        'lebron james',
        'kobe bryant',
        'luka dončić',
        'victor wembanyama',
        'charizard',
        'pikachu',
        'umbreon',
        'patrick mahomes',
        'tom brady',
        'shohei ohtani',
        'lionel messi',
    ];

    const playerName = player.name.toLowerCase();

    if (highValuePlayers.some((name) => playerName.includes(name))) {
        return 500; // Grade tier
    }

    // Sport-based estimates
    if (sport === 'basketball') {
        return 100; // Keep tier
    }

    if (sport === 'pokemon') {
        return 80; // Keep tier
    }

    if (sport === 'football' || sport === 'baseball') {
        return 75; // Keep tier
    }

    // Default
    return 50; // Keep tier (lower end)
}

/**
 * Categorize card by estimated value
 */
export function categorizeByValue(value: number): 'grade' | 'keep' | 'bulk' {
    if (value >= 150) return 'grade'; // Send to PSA/BGS
    if (value >= 50) return 'keep'; // List individually
    return 'bulk'; // Sell as lot
}
