
'use server';

import { z } from 'zod';

// Mock schemas
const ExtractCardNameOutputSchema = z.object({
  playerName: z.string(),
  cardBrand: z.string().optional(),
  cardColor: z.string().optional(),
  sport: z.string().optional(),
  cardYear: z.number().nullable().optional(),
});

const QuickScanOutputSchema = z.object({
  playerName: z.string(),
});

// Mock functions that always work
export async function extractCardName(imageDataUri: string) {
  console.log('[MOCK] extractCardName called');
  
  // Return mock data
  return {
    playerName: "Michael Jordan",
    cardBrand: "Topps",
    cardColor: "Red/Blue",
    sport: "Basketball",
    cardYear: 1986
  };
}

export async function quickScan(imageDataUri: string) {
  console.log('[MOCK] quickScan called');
  
  // Return mock data
  return {
    playerName: "Test Player"
  };
}
