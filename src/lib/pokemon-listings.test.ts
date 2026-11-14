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
  it('also treats other TCGs and mis-filed Pokémon as Pokémon-section listings', () => {
    expect(isPokemonListing({ subCategory: 'Yu-Gi-Oh!', title: 'Blue-Eyes White Dragon' })).toBe(true);
    expect(isPokemonListing({
      title: 'Antique Sail Fossil',
      category: 'Collector Cards',
      subCategory: 'Sports Cards',
      brand: 'Panini',
      specs: { setName: 'Pokemon', pokemonCode: 'POR' },
    })).toBe(true);
    expect(isPokemonListing({ title: '2023 Panini Prizm Magic Johnson', brand: 'Panini' })).toBe(false);
    expect(isPokemonListing({ title: '2024 Topps Chrome Shota Imanaga', brand: 'Topps' })).toBe(false);
  });
});
