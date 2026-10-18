import { buildEbayQuery, type CardIdentity } from './ebay';

export interface IdentityExtras {
  subCategory?: string | null;
  rookie?: boolean | null;
  conditionGuess?: string | null;
  description?: string | null;
  keywords?: string[] | null;
}

const GRADERS = ['PSA', 'BGS', 'CGC', 'SGC'] as const;
const str = (v: unknown) => (v == null ? '' : String(v).trim());
const real = (v: unknown) => { const s = str(v); return s && !/^(n\/?a|none|null|unknown)$/i.test(s) ? s : ''; };

/** Listing title, e.g. "2023 Panini Prizm Victor Wembanyama #136 Silver Prizm RC". */
export function buildCardTitle(c: CardIdentity & IdentityExtras): string {
  let t = buildEbayQuery(c, 20);
  if (c.rookie && t && !/\b(RC|rookie)\b/i.test(t)) t += ' RC';
  return t.slice(0, 120);
}

/** Map an AI identity to draft listing fields. Price is left at 0 for the seller. */
export function buildDraftFields(c: (CardIdentity & IdentityExtras) | null) {
  const base = { title: 'Card (AutoCard draft)', price: 0, category: 'Collector Cards', condition: 'Used' } as Record<string, any>;
  if (!c) return base;
  const title = buildCardTitle(c);
  const grader = real(c.gradingCompany).toUpperCase();
  const slabbed = (GRADERS as readonly string[]).includes(grader) && !!real(c.grade);
  const yearNum = parseInt(str(c.year).slice(0, 4), 10);
  const brand = real(c.brand), set = real(c.set), name = real(c.name), num = real(c.cardNumber).replace(/^#/, ''), variant = real(c.variant);
  const kw = new Set<string>((c.keywords ?? []).map((k) => str(k).toLowerCase()).filter(Boolean));
  [name, brand, set, variant, c.rookie ? 'rookie' : ''].forEach((k) => k && kw.add(k.toLowerCase()));
  const out: Record<string, any> = {
    ...base,
    title: title || base.title,
    subCategory: real(c.subCategory) || undefined,
    brand: brand || undefined,
    manufacturer: brand || undefined,
    model: set || undefined,
    year: Number.isFinite(yearNum) && yearNum > 1800 ? yearNum : undefined,
    cardNumber: num || undefined,
    player: name || undefined,
    parallel: variant || undefined,
    gradingCompany: slabbed ? grader : 'Raw',
    grade: slabbed ? real(c.grade) : undefined,
    condition: slabbed ? `${grader} ${real(c.grade)}` : real(c.conditionGuess) || 'Used',
    description: real(c.description) || (title ? `${title}. Photos are of the actual card.` : undefined),
    keywords: [...kw].slice(0, 12),
  };
  Object.keys(out).forEach((k) => out[k] === undefined && delete out[k]);
  return out;
}
