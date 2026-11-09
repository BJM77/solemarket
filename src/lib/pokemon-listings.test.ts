import { describe, it, expect } from 'vitest';
import { isPokemonListing, withoutPokemon } from './pokemon-listings';

describe('pokemon listings', () => {
  it('matches every spelling in use', () => {
    expect(isPokemonListing({ subCategory: 'Pokémon' })).toBe(true);
    expect(isPokemonListing({ subCategory: 'Pokémon Cards' })).toBe(true);
    expect(isPokemonListing({ subCategory: 'Pokemon TCG' })).toBe(true);
    expect(isPokemonListing({ subCategory: 'Basketball Cards', brand: 'The Pokemon Company' })).toBe(true);
    expect(isPokemonListing({ storefrontId: 'pokemon' })).toBe(true);
  });
  it('leaves basketball listings alone', () => {
    expect(isPokemonListing({ category: 'Collector Cards', subCategory: 'Rookies', brand: 'Panini' })).toBe(false);
    expect(withoutPokemon([{ subCategory: 'Pokémon' }, { subCategory: 'Rookies' }])).toEqual([{ subCategory: 'Rookies' }]);
  });
});
