import type { Player } from './research-types';
import type { ExtractCardNameOutput } from '@/ai/flows/extract-card-name';

/**
 * Verifies if a scanned card matches the user's keep list criteria
 */
export function verifyCard(
    extractedDetails: ExtractCardNameOutput,
    playersToKeep: Player[]
): { isKeeper: boolean; isPrizmRookie: boolean } {
    const playerName = extractedDetails.playerName.toLowerCase();
    const matchedPlayer = playersToKeep.find(
        (p) => p.name.toLowerCase() === playerName
    );

    const isKeeper = !!matchedPlayer;

    // Check if it's a Prizm Rookie card (special designation)
    const isPrizmRookie =
        isKeeper &&
        extractedDetails.cardBrand?.toLowerCase().includes('prizm') === true &&
        extractedDetails.cardColor?.toLowerCase().includes('rookie') === true;

    return { isKeeper, isPrizmRookie };
}

/**
 * Formats card details for display
 */
export function formatCardDetails(item: {
    name: string;
    brand?: string;
    cardColor?: string;
    sport?: string;
    cardYear?: number | null;
}): string {
    const parts: string[] = [item.name];

    if (item.cardYear) parts.push(`${item.cardYear}`);
    if (item.brand) parts.push(item.brand);
    if (item.cardColor) parts.push(item.cardColor);
    if (item.sport) parts.push(item.sport);

    return parts.join(' • ');
}
