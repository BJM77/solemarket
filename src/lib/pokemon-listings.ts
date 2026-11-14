/**
 * Pokémon and other trading card game listings live in the Pokémon & trading
 * cards section (/pokemon, later pokemon.benched.au) and are kept off the
 * main basketball site.
 *
 * The historical names in this file are kept so existing call sites keep
 * working; they now detect every TCG, not only Pokémon. The real matcher
 * lives in tcg-listings.ts.
 *
 * isPokemonSubCategory stays Pokémon-only so Firestore 'in' queries that
 * use POKEMON_SUBCATEGORIES are not accidentally applied to Yu-Gi-Oh etc.
 */
import { isTcgListing, withoutTcg } from './tcg-listings';

export { isTcgListing, isTcgValue, withoutTcg } from './tcg-listings';

export const POKEMON_SUBCATEGORIES = ['Pokémon', 'Pokemon', 'Pokémon Cards', 'Pokemon Cards', 'Pokémon TCG', 'Pokemon TCG'];

const POKEMON_RE = /pok[eé]mon/i;

export function isPokemonSubCategory(value: unknown): boolean {
  return typeof value === 'string' && POKEMON_RE.test(value);
}

/** True for a Pokémon or other TCG listing that should live on /pokemon. */
export function isPokemonListing(p: Parameters<typeof isTcgListing>[0]): boolean {
  return isTcgListing(p);
}

/** Drop TCG listings from a main-site list. */
export function withoutPokemon<T extends Parameters<typeof isTcgListing>[0]>(items: T[]): T[] {
  return withoutTcg(items);
}
