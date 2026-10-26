import { describe, expect, it } from 'vitest';
import { getProductUrl, slugify } from './url';

describe('slugify', () => {
  it('transliterates accented letters instead of dropping them', () => {
    expect(slugify('2023 Pokémon Crown Zenith Pikachu #160/159')).toBe('2023-pokemon-crown-zenith-pikachu-160159');
    expect(slugify('Café Crème')).toBe('cafe-creme');
  });

  it('keeps existing ASCII slugs unchanged', () => {
    expect(slugify('2024 Topps Chrome Shota Imanaga Rookie Card #199')).toBe('2024-topps-chrome-shota-imanaga-rookie-card-199');
    expect(slugify('Nike Air Force 1 Low')).toBe('nike-air-force-1-low');
  });

  it('turns & into "and" and trims stray hyphens', () => {
    expect(slugify('Shoes & Cards')).toBe('shoes-and-cards');
    expect(slugify('  -Rare!- ')).toBe('rare');
  });

  it('never returns an empty segment', () => {
    expect(slugify('ピカチュウ')).toBe('item');
    expect(slugify('!!!')).toBe('item');
  });
});

describe('getProductUrl', () => {
  it('builds the canonical pretty URL', () => {
    expect(getProductUrl({ id: 'abc', title: 'Pokémon Pikachu', category: 'Collector Cards' })).toBe('/cards/pokemon-pikachu/abc');
  });
});
