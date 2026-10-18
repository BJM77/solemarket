/** Card identity returned by the AutoCard identify flow (all fields optional). */
export interface CardIdentity {
  name?: string | null;        // player / character
  year?: string | number | null;
  brand?: string | null;       // e.g. Panini, Topps, Pokémon
  set?: string | null;         // e.g. Prizm, Base Set
  cardNumber?: string | null;  // e.g. 248, 4/102
  variant?: string | null;     // parallel / variant, e.g. Silver, Holo, Refractor
  gradingCompany?: string | null; // PSA, BGS, CGC, SGC (null when raw)
  grade?: string | number | null;
}

const clean = (v: unknown) => String(v ?? '').replace(/[^\p{L}\p{N}\s/#.\-'&]/gu, ' ').replace(/\s+/g, ' ').trim();
const isEmpty = (s: string) => !s || /^(n\/?a|none|null|unknown|raw|base)$/i.test(s);

/**
 * Concise eBay search: "<year> <brand> <set> <name> #<number> <variant> <grader grade>".
 * Drops empty/placeholder parts, de-duplicates repeated words (e.g. brand "Panini" + set
 * "Panini Prizm"), and caps length so eBay still finds sold results.
 */
export function buildEbayQuery(c: CardIdentity, maxWords = 12): string {
  const num = clean(c.cardNumber).replace(/^#+\s*/, '');
  const grader = clean(c.gradingCompany).toUpperCase();
  const grade = clean(c.grade);
  const parts = [
    clean(c.year), clean(c.brand), clean(c.set), clean(c.name),
    isEmpty(num) ? '' : `#${num}`,
    clean(c.variant),
    !isEmpty(grader) && !isEmpty(grade) ? `${grader} ${grade}` : '',
  ].filter((p) => !isEmpty(p));
  const seen = new Set<string>();
  const words: string[] = [];
  for (const w of parts.join(' ').split(' ')) {
    const k = w.toLowerCase();
    if (!w || seen.has(k)) continue;
    seen.add(k); words.push(w);
  }
  return words.slice(0, maxWords).join(' ');
}

export function ebaySoldUrl(query: string): string {
  return `https://www.ebay.com.au/sch/i.html?_nkw=${encodeURIComponent(query.trim())}&LH_Sold=1&LH_Complete=1`;
}
