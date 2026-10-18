'use server';
import { z } from 'zod';
import { ai } from '@/ai/genkit';
import { assertRateLimit } from '@/lib/rate-limit-guard';
import { verifyIdToken } from '@/lib/firebase/auth-admin';
import { buildEbayQuery, type CardIdentity } from '@/lib/autocard/ebay';

const IdentitySchema = z.object({
  name: z.string().nullable().describe('Player or character name'),
  year: z.string().nullable().describe('Release year / season, e.g. 2019 or 2019-20'),
  brand: z.string().nullable().describe('Manufacturer, e.g. Panini, Topps, Upper Deck, Pokémon'),
  set: z.string().nullable().describe('Set / product line, e.g. Prizm, Select, Base Set'),
  cardNumber: z.string().nullable().describe('Card number as printed, without #'),
  variant: z.string().nullable().describe('Parallel / variant / insert, e.g. Silver, Holo, Refractor, /99'),
  gradingCompany: z.string().nullable().describe('PSA, BGS, CGC, SGC if slabbed, else null'),
  grade: z.string().nullable().describe('Grade on the slab label if slabbed, else null'),
  subCategory: z.string().nullable().describe("Card type, e.g. 'Basketball Cards', 'NRL Cards', 'AFL Cards', 'Pokémon', 'Yu-Gi-Oh!', 'Soccer Cards'"),
  rookie: z.boolean().nullable().describe('True if marked rookie (RC)'),
  conditionGuess: z.string().nullable().describe('Raw condition guess from the photos: Mint, Near Mint, Excellent, Good, Played'),
  description: z.string().nullable().describe('One or two sentence listing description, factual, no price'),
  keywords: z.array(z.string()).nullable().describe('Up to 8 search keywords'),
  confidence: z.number().min(0).max(1).describe('Overall confidence 0-1'),
});

const identifyPrompt = ai.definePrompt({
  name: 'autocardIdentifyPrompt',
  model: 'googleai/gemini-3.6-flash',
  input: { schema: z.object({ front: z.string(), back: z.string() }) },
  output: { schema: IdentitySchema },
  prompt: `You are an expert trading card identifier (sports cards, Pokémon, TCG).
Identify this card from its front and back photos. Read the back for year, set and card number; read any slab label for grading company and grade.
Also give a short factual listing description, keywords and a raw condition guess (corners, edges, surface) if not slabbed.
Use null for anything you cannot read. Do not guess a parallel unless clearly visible.

Front: {{media url=front}}
Back: {{media url=back}}`,
});

export type IdentifyCardResult =
  | { ok: true; identity: CardIdentity & z.infer<typeof IdentitySchema>; query: string }
  | { ok: false; error: string };

/** Identify a card from AutoCard front/back JPEG data URIs and build an eBay sold query. */
export async function identifyCardForEbay(idToken: string, front: string, back: string): Promise<IdentifyCardResult> {
  try {
    await verifyIdToken(idToken);
  } catch {
    return { ok: false, error: 'Please sign in to identify cards.' };
  }
  try {
    await assertRateLimit('ai', { limit: 60, windowSeconds: 600, persistent: true });
    const isImg = (s: string) => typeof s === 'string' && /^data:image\/(jpeg|png|webp);base64,/.test(s) && s.length < 4_000_000;
    if (!isImg(front) || !isImg(back)) return { ok: false, error: 'Invalid images.' };
    const { output } = await identifyPrompt({ front, back });
    if (!output) return { ok: false, error: 'Could not identify this card.' };
    const query = buildEbayQuery(output);
    if (!query) return { ok: false, error: 'Could not read enough detail from the card.' };
    return { ok: true, identity: output, query };
  } catch (e: any) {
    console.error('[autocard] identify failed', e);
    return { ok: false, error: /rate/i.test(e?.message ?? '') ? 'Too many requests, try again shortly.' : 'Identification failed. You can type a search instead.' };
  }
}
