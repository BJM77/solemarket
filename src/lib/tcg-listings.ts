/**
 * Trading card game (TCG) listings belong on the Pokémon & trading cards
 * storefront (/pokemon, later pokemon.benched.au), not the basketball site.
 *
 * Detection uses storefrontId, category, subCategory, brand, title, model,
 * description and specs (setName, pokemonCode, game, …) so a mis-filed
 * Pokémon card still routes correctly. Sports cards — basketball, baseball
 * and so on — stay on the main site. Bare words like "Magic" or "Dragon"
 * are not enough: "Magic Johnson" and "Orlando Magic" must not match.
 *
 * Coins and bullion are handled separately in coin-listings.ts.
 */

export type TcgListingFields = {
  category?: unknown;
  subCategory?: unknown;
  brand?: unknown;
  manufacturer?: unknown;
  storefrontId?: unknown;
  title?: unknown;
  model?: unknown;
  description?: unknown;
  setName?: unknown;
  pokemonCode?: unknown;
  game?: unknown;
  keywords?: unknown;
  specs?: unknown;
} | null | undefined;

/** Pokémon in either spelling, including "The Pokemon Company". */
const POKEMON_RE = /pok[eé]mon/i;

/** Magic: The Gathering only — never a bare "Magic". */
const MAGIC_GATHERING_RE = /magic\s*:?\s*the\s*gathering/i;
const MTG_WORD_RE = /\bmtg\b/i;
const WOTC_RE = /wizards\s+of\s+the\s+coast/i;
/** Whole-field values from the sell form or filters ("Magic", "MTG Cards"). */
const MAGIC_FIELD_RE = /^(magic|magic\s*:?\s*the\s*gathering|mtg|mtg\s*cards|magic\s*cards)$/i;

const YUGIOH_RE = /yu-?gi-?oh!?|\byugioh\b/i;
const ONE_PIECE_RE = /\bone\s*piece\b/i;
const LORCANA_RE = /\blorcana\b/i;
const DIGIMON_RE = /\bdigimon\b/i;
/** "Dragon Ball", "Dragon Ball Super", "Dragon Ball Card Game" — not "Dragon" alone. */
const DRAGON_BALL_RE = /\bdragon\s*balls?\b/i;
const DRAGON_BALL_CG_RE = /\bdbs\s*-?\s*(ccg|tcg|cg)\b|\bbandai\s+card\s+game\b/i;
const FLESH_AND_BLOOD_RE = /\bflesh\s*(?:and|&)\s*blood\b/i;
const WEISS_RE = /weiss\s*schwarz/i;
const SWU_RE = /\bstar\s*wars\s*unlimited\b/i;
const VANGUARD_RE = /\bcardfight(?:\s*vanguard)?\b|\bvanguard\s*(?:tcg|card)\b/i;
const SHADOWVERSE_RE = /\bshadowverse\b/i;
const UNION_ARENA_RE = /\bunion\s*arena\b/i;
const GUNDAM_CG_RE = /\bgundam\s+card\s+game\b/i;
/** "trading card game" / "collectible card game" — not "NBA trading cards". */
const TRADING_CARD_GAME_RE = /\btrading\s+card\s+games?\b|\bcollectible\s+card\s+games?\b/i;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/** True when a single field (category, title, setName, …) names a TCG. */
export function isTcgValue(value: unknown): boolean {
  if (!isNonEmptyString(value)) return false;
  const s = value.trim();
  return (
    POKEMON_RE.test(s) ||
    MAGIC_GATHERING_RE.test(s) ||
    MTG_WORD_RE.test(s) ||
    WOTC_RE.test(s) ||
    MAGIC_FIELD_RE.test(s) ||
    YUGIOH_RE.test(s) ||
    ONE_PIECE_RE.test(s) ||
    LORCANA_RE.test(s) ||
    DIGIMON_RE.test(s) ||
    DRAGON_BALL_RE.test(s) ||
    DRAGON_BALL_CG_RE.test(s) ||
    FLESH_AND_BLOOD_RE.test(s) ||
    WEISS_RE.test(s) ||
    SWU_RE.test(s) ||
    VANGUARD_RE.test(s) ||
    SHADOWVERSE_RE.test(s) ||
    UNION_ARENA_RE.test(s) ||
    GUNDAM_CG_RE.test(s) ||
    TRADING_CARD_GAME_RE.test(s)
  );
}

function collectFieldValues(p: NonNullable<TcgListingFields>): unknown[] {
  const values: unknown[] = [
    p.category,
    p.subCategory,
    p.brand,
    p.manufacturer,
    p.title,
    p.model,
    p.description,
    p.setName,
    p.game,
  ];
  if (Array.isArray(p.keywords)) values.push(...p.keywords);
  else if (isNonEmptyString(p.keywords)) values.push(p.keywords);
  if (p.specs && typeof p.specs === 'object') {
    for (const v of Object.values(p.specs as Record<string, unknown>)) {
      values.push(v);
    }
  }
  return values;
}

function hasPokemonCode(p: NonNullable<TcgListingFields>): boolean {
  const fromSpecs =
    p.specs && typeof p.specs === 'object'
      ? (p.specs as Record<string, unknown>).pokemonCode
      : undefined;
  const code = p.pokemonCode ?? fromSpecs;
  return isNonEmptyString(code);
}

/** True for a Pokémon or other TCG listing that should live on /pokemon. */
export function isTcgListing(p: TcgListingFields): boolean {
  if (!p) return false;
  if (p.storefrontId === 'pokemon') return true;
  if (hasPokemonCode(p)) return true;
  return collectFieldValues(p).some(isTcgValue);
}

/** Drop TCG listings from a main-site (basketball) list. */
export function withoutTcg<T extends TcgListingFields>(items: T[]): T[] {
  return items.filter((item) => !isTcgListing(item));
}
