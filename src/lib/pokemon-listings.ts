/**
 * Pokémon listings live in the Pokémon section (/pokemon, later pokemon.benched.au)
 * and are kept off the main basketball site. Existing listings use a few
 * different sub-category spellings, so match them all.
 */
export const POKEMON_SUBCATEGORIES = ['Pokémon', 'Pokemon', 'Pokémon Cards', 'Pokemon Cards', 'Pokémon TCG', 'Pokemon TCG'];

const POKEMON_RE = /pok[eé]mon/i;

export function isPokemonSubCategory(value: unknown): boolean {
  return typeof value === 'string' && POKEMON_RE.test(value);
}

export function isPokemonListing(p: { category?: unknown; subCategory?: unknown; brand?: unknown; storefrontId?: unknown } | null | undefined): boolean {
  if (!p) return false;
  if (p.storefrontId === 'pokemon') return true;
  return isPokemonSubCategory(p.subCategory) || isPokemonSubCategory(p.category) || isPokemonSubCategory(p.brand);
}

/** Drop Pokémon listings from a main-site list. */
export function withoutPokemon<T extends Parameters<typeof isPokemonListing>[0]>(items: T[]): T[] {
  return items.filter((p) => !isPokemonListing(p));
}
