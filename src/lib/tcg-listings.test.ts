import { describe, it, expect } from 'vitest';
import { isTcgListing, isTcgValue, withoutTcg } from './tcg-listings';

/** Mis-filed live listing JXcO36B6yRGT2TUd7WG5 — still showing on basketball. */
const antiqueSailFossil = {
  id: 'JXcO36B6yRGT2TUd7WG5',
  title: 'Antique Sail Fossil',
  category: 'Collector Cards',
  subCategory: 'Sports Cards',
  brand: 'Panini',
  model: 'Pokémon Temporal Forces',
  description: 'Antique Sail Fossil from the Pokémon set Paldea/Temporal Forces.',
  specs: { setName: 'Pokemon', pokemonCode: 'POR' },
};

/** Live baseball card xyiUC1pbutWR6QDQXnOv — stays on basketball, not TCG. */
const imanagaBaseball = {
  id: 'xyiUC1pbutWR6QDQXnOv',
  title: '2024 Topps Chrome Shota Imanaga',
  category: 'Collector Cards',
  subCategory: 'Sports Cards',
  brand: 'Topps',
};

describe('isTcgValue', () => {
  it('matches Pokémon spellings and other TCG names', () => {
    expect(isTcgValue('Pokémon')).toBe(true);
    expect(isTcgValue('Pokemon TCG')).toBe(true);
    expect(isTcgValue('Yu-Gi-Oh!')).toBe(true);
    expect(isTcgValue('Yugioh')).toBe(true);
    expect(isTcgValue('Magic: The Gathering')).toBe(true);
    expect(isTcgValue('Magic')).toBe(true);
    expect(isTcgValue('MTG')).toBe(true);
    expect(isTcgValue('One Piece')).toBe(true);
    expect(isTcgValue('Disney Lorcana')).toBe(true);
    expect(isTcgValue('Digimon')).toBe(true);
    expect(isTcgValue('Dragon Ball Super')).toBe(true);
    expect(isTcgValue('Flesh and Blood')).toBe(true);
    expect(isTcgValue('Weiss Schwarz')).toBe(true);
    expect(isTcgValue('Star Wars Unlimited')).toBe(true);
  });

  it('does not treat sports wording as a TCG', () => {
    expect(isTcgValue('Magic Johnson')).toBe(false);
    expect(isTcgValue('Orlando Magic')).toBe(false);
    expect(isTcgValue('Dragon')).toBe(false);
    expect(isTcgValue('NBA trading cards')).toBe(false);
    expect(isTcgValue('Panini')).toBe(false);
    expect(isTcgValue('Topps')).toBe(false);
    expect(isTcgValue('Sports Cards')).toBe(false);
  });
});

describe('isTcgListing', () => {
  it('matches tagged Pokémon listings', () => {
    expect(isTcgListing({ subCategory: 'Pokémon' })).toBe(true);
    expect(isTcgListing({ subCategory: 'Pokémon Cards' })).toBe(true);
    expect(isTcgListing({ subCategory: 'Pokemon TCG' })).toBe(true);
    expect(isTcgListing({ subCategory: 'Basketball Cards', brand: 'The Pokemon Company' })).toBe(true);
    expect(isTcgListing({ storefrontId: 'pokemon' })).toBe(true);
  });

  it('catches the mis-filed Antique Sail Fossil Pokémon card', () => {
    expect(isTcgListing(antiqueSailFossil)).toBe(true);
    // Strong TCG signals in specs win even when brand/category look like sports.
    expect(isTcgListing({
      category: 'Collector Cards',
      subCategory: 'Sports Cards',
      brand: 'Panini',
      specs: { setName: 'Pokemon', pokemonCode: 'POR' },
    })).toBe(true);
    expect(isTcgListing({
      category: 'Collector Cards',
      subCategory: 'Sports Cards',
      brand: 'Topps',
      title: 'Antique Sail Fossil',
      specs: { pokemonCode: 'POR' },
    })).toBe(true);
  });

  it('matches other trading card games', () => {
    expect(isTcgListing({ subCategory: 'Yu-Gi-Oh!', title: 'Blue-Eyes White Dragon' })).toBe(true);
    expect(isTcgListing({ title: 'Black Lotus', brand: 'Wizards of the Coast' })).toBe(true);
    expect(isTcgListing({ title: 'Magic: The Gathering Bloomburrow booster' })).toBe(true);
    expect(isTcgListing({ title: 'MTG Foundations starter kit', category: 'Collector Cards' })).toBe(true);
    expect(isTcgListing({ title: 'One Piece OP-01 Romance Dawn pack' })).toBe(true);
    expect(isTcgListing({ title: 'Disney Lorcana Tinker Bell' })).toBe(true);
    expect(isTcgListing({ title: 'Digimon Card Game starter deck' })).toBe(true);
    expect(isTcgListing({ title: 'Dragon Ball Super Card Game booster' })).toBe(true);
    expect(isTcgListing({ title: 'Flesh and Blood Welcome to Rathe' })).toBe(true);
    expect(isTcgListing({ title: 'Weiss Schwarz Trial Deck' })).toBe(true);
    expect(isTcgListing({ title: 'Star Wars Unlimited Spark of Rebellion' })).toBe(true);
    expect(isTcgListing({ specs: { game: 'Yu-Gi-Oh', setName: 'Legend of Blue Eyes' } })).toBe(true);
  });

  it('leaves NBA, baseball and Magic Johnson sports cards on basketball', () => {
    expect(isTcgListing({ category: 'Collector Cards', subCategory: 'Rookies', brand: 'Panini' })).toBe(false);
    expect(isTcgListing({
      title: '2023 Prizm LeBron James',
      category: 'Collector Cards',
      subCategory: 'Basketball',
      brand: 'Panini',
    })).toBe(false);
    expect(isTcgListing({
      title: '2023 Panini Prizm Magic Johnson',
      category: 'Collector Cards',
      subCategory: 'Basketball Cards',
      brand: 'Panini',
    })).toBe(false);
    expect(isTcgListing({
      title: 'Orlando Magic court-side pass card',
      category: 'Collector Cards',
      brand: 'Panini',
    })).toBe(false);
    expect(isTcgListing(imanagaBaseball)).toBe(false);
    expect(isTcgListing({ title: 'Dragon sleeved hoodie', category: 'Sneakers', brand: 'Nike' })).toBe(false);
    expect(isTcgListing(null)).toBe(false);
  });

  it('does not let a sports brand hide a real TCG, and does not treat sports brands as TCG on their own', () => {
    expect(isTcgListing({ brand: 'Panini', title: '2024 Select Anthony Edwards' })).toBe(false);
    expect(isTcgListing({ brand: 'Topps', title: '2024 Chrome Shota Imanaga' })).toBe(false);
    expect(isTcgListing({ brand: 'Panini', title: 'Pikachu Pokémon ex' })).toBe(true);
  });
});

describe('withoutTcg', () => {
  it('drops TCG listings and keeps sports cards', () => {
    expect(withoutTcg([
      antiqueSailFossil,
      imanagaBaseball,
      { title: '2023 Prizm LeBron James', brand: 'Panini' },
      { subCategory: 'Yu-Gi-Oh!', title: 'Dark Magician' },
    ])).toEqual([
      imanagaBaseball,
      { title: '2023 Prizm LeBron James', brand: 'Panini' },
    ]);
  });
});
