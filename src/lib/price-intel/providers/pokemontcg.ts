/**
 * pokemontcg.io v2 (free; optional POKEMONTCG_API_KEY raises rate limits).
 * Returns TCGplayer (USD) market and Cardmarket (EUR) trend prices as "market" comps.
 */
import type { Comp, PriceQuery, ProviderResult } from '../types';
import { keywords, parseCardNumber, toAud, titleSimilarity } from '../stats';

export function looksLikePokemon(q: PriceQuery): boolean {
    const text = `${q.query} ${q.category || ''}`.toLowerCase();
    return /pok[eé]mon|charizard|pikachu|eevee|mewtwo|umbreon|gengar|lugia|rayquaza|blastoise|venusaur|\bex\b|\bvmax\b|\bgx\b/.test(text)
        || (q.category === 'Collector Cards' && /\b\d{1,3}\s*\/\s*\d{1,3}\b/.test(text));
}

export function buildPokemonQuery(query: string): string | null {
    const number = parseCardNumber(query);
    const words = keywords(query).filter(w => !/^\d/.test(w) && !w.includes('/') && w.length > 2);
    if (!words.length) return null;
    const name = words[0].replace(/[^a-z0-9-]/g, '');
    return number ? `name:${name}* number:${number}` : `name:${name}*`;
}

export function mapPokemonCards(cards: any[], query: string): Comp[] {
    const comps: Comp[] = [];
    for (const card of cards || []) {
        const title = `${card.name} ${card.set?.name || ''} ${card.number}/${card.set?.printedTotal ?? ''}`.trim();
        if (titleSimilarity(query, `${title} ${card.set?.series || ''}`) < 0.34) continue;
        const tp = card.tcgplayer?.prices || {};
        for (const [variant, p] of Object.entries<any>(tp)) {
            const aud = toAud(Number(p?.market ?? p?.mid), 'USD');
            if (aud) comps.push({ source: 'pokemontcg', kind: 'market', title: `${title} (${variant}, TCGplayer)`, price: aud, originalPrice: Number(p?.market ?? p?.mid), originalCurrency: 'USD', url: card.tcgplayer?.url, date: card.tcgplayer?.updatedAt?.replace(/\//g, '-'), variant });
        }
        const cm = card.cardmarket?.prices;
        const eur = Number(cm?.trendPrice || cm?.averageSellPrice);
        const audCm = toAud(eur, 'EUR');
        if (audCm) comps.push({ source: 'pokemontcg', kind: 'market', title: `${title} (Cardmarket trend)`, price: audCm, originalPrice: eur, originalCurrency: 'EUR', url: card.cardmarket?.url, date: card.cardmarket?.updatedAt?.replace(/\//g, '-') });
    }
    return comps;
}

export async function pokemonTcgProvider(q: PriceQuery, fetchImpl: typeof fetch = fetch): Promise<ProviderResult> {
    if (!looksLikePokemon(q)) return { source: 'pokemontcg', ok: true, note: 'not a Pokemon card query', comps: [] };
    const query = buildPokemonQuery(q.query);
    if (!query) return { source: 'pokemontcg', ok: true, note: 'query too vague', comps: [] };
    try {
        const url = `https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(query)}&pageSize=12&orderBy=-set.releaseDate&select=id,name,number,set,tcgplayer,cardmarket`;
        const headers: Record<string, string> = {};
        if (process.env.POKEMONTCG_API_KEY) headers['X-Api-Key'] = process.env.POKEMONTCG_API_KEY;
        const res = await fetchImpl(url, { headers, signal: AbortSignal.timeout(8000) } as any);
        if (!res.ok) return { source: 'pokemontcg', ok: false, note: `HTTP ${res.status}`, comps: [] };
        const json: any = await res.json();
        return { source: 'pokemontcg', ok: true, comps: mapPokemonCards(json?.data || [], q.query) };
    } catch (e: any) {
        return { source: 'pokemontcg', ok: false, note: e?.message || 'request failed', comps: [] };
    }
}
