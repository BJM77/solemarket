import { Player } from './players';
import stringSimilarity from 'string-similarity';

type CardDetails = {
  playerName: string;
  cardBrand?: string;
  cardYear?: number | null;
};

type VerificationResult = {
  isKeeper: boolean;
  isPrizmRookie: boolean;
};


const normalize = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "") // allow numbers
    .replace(/\s+/g, " ")
    .trim();


/**
 * Verifies a card against the player list to determine its status.
 * @param cardDetails The extracted details of the card.
 * @param players The list of players to keep.
 * @returns An object indicating if the card is a keeper and if it's a special Prizm rookie.
 */
export function verifyCard(
  cardDetails: CardDetails,
  players: Player[]
): VerificationResult {
  const { playerName, cardBrand, cardYear } = cardDetails;

  const result: VerificationResult = {
    isKeeper: false,
    isPrizmRookie: false,
  };

  const normalizedPlayerName = normalize(playerName);
  const playerNamesToKeep = players.map(p => normalize(p.name));
  
  const bestMatch = stringSimilarity.findBestMatch(normalizedPlayerName, playerNamesToKeep);

  if (bestMatch.bestMatch.rating > 0.7) { // Using a 0.7 threshold for better tolerance
    const matchedPlayer = players.find(p => normalize(p.name) === bestMatch.bestMatch.target);

    if (matchedPlayer) {
        result.isKeeper = true;
        // Check for the "super special" Prizm rookie condition
        if (
          matchedPlayer.prizmRookieYear &&
          cardBrand?.toLowerCase().includes('prizm') &&
          cardYear === matchedPlayer.prizmRookieYear
        ) {
          result.isPrizmRookie = true;
        }
    }
  }


  return result;
}
