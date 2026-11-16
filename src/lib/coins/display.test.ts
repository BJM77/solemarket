import { describe, it, expect } from 'vitest';
import { coinTileTitle, coinTitleRows, coinTileBadge, weightLabel, coinSpecRows } from './display';

const LIVE = [
  { title: '2023 Australian $2 Vietnam War 50th Anniversary Carded Coin', category: 'Coins', subCategory: 'Australian Coins', model: '$$2' },
  { title: '2022 $2 Team Australia Commonwealth Games Coloured Coin', category: 'Coins', subCategory: 'Australian Coins', model: '$$2' },
  { title: '2022 Australian Commonwealth Games Team $2 Coin', category: 'Coins', condition: 'Aluminium Bronze' },
];
const GOLD = { title: '2024 1 oz Perth Mint Kangaroo Gold Coin', category: 'Bullion', subCategory: 'Gold Bullion', metal: 'Gold', weight: '1 oz', purity: '.9999', year: 2024, mint: 'Perth Mint', country: 'Australia' };
const BAR = { title: '1 kg Perth Mint Silver Cast Bar', category: 'Bullion', subCategory: 'Silver Bullion', metal: 'Silver', weight: '1 kg', purity: '.999', mint: 'Perth Mint' };
const PENNY = { title: '1930 Australian Penny', category: 'Coins', year: 1930, denomination: '1 penny', country: 'Australia', gradingCompany: 'PCGS', grade: 'VF35', certNumber: '123' };

describe('coin tile titles', () => {
  it('shows year + denomination + name for coins', () => {
    expect(coinTileTitle(LIVE[0])).toBe('2023 $2 Vietnam War 50th Anniversary');
    expect(coinTileTitle(LIVE[1])).toBe('2022 $2 Team Australia Commonwealth Games Coloured');
    expect(coinTileTitle(LIVE[2])).toBe('2022 $2 Commonwealth Games Team');
    expect(coinTileTitle(PENNY)).toBe('1930 1 penny');
  });
  it('shows year + weight + name for bullion', () => {
    expect(coinTileTitle(GOLD)).toBe('2024 1 oz Perth Mint Kangaroo Gold Coin');
    expect(coinTileTitle(BAR)).toBe('1 kg Perth Mint Silver Cast Bar');
  });
  it('falls back to the title', () => {
    expect(coinTileTitle({ title: 'Mixed lot' })).toBe('Mixed lot');
  });
});

describe('coin listing heading', () => {
  it('splits into year + country, then the rest', () => {
    expect(coinTitleRows(LIVE[0])).toEqual({ row1: '2023 Australia', row2: '$2 Vietnam War 50th Anniversary Carded Coin' });
    expect(coinTitleRows(LIVE[2])).toEqual({ row1: '2022 Australia', row2: 'Commonwealth Games Team $2 Coin' });
    expect(coinTitleRows(GOLD)).toEqual({ row1: '2024 Australia', row2: '1 oz Perth Mint Kangaroo Gold Coin' });
    expect(coinTitleRows(PENNY)).toEqual({ row1: '1930 Australia', row2: 'Penny' });
  });
  it('uses the mint when there is no country, and keeps one row when it cannot split', () => {
    expect(coinTitleRows({ title: '2020 Perth Mint Lunar Rat 1oz', year: 2020, mint: 'Perth Mint' })).toEqual({ row1: '2020 Perth Mint', row2: 'Lunar Rat 1oz' });
    expect(coinTitleRows(BAR)).toEqual({ row1: '1 kg Perth Mint Silver Cast Bar', row2: '' });
  });
});

describe('coin tile badges', () => {
  it('shows the slab for graded coins and weight + metal for bullion', () => {
    expect(coinTileBadge(PENNY)).toBe('PCGS VF35');
    expect(coinTileBadge(GOLD)).toBe('1 oz Gold');
    expect(coinTileBadge(BAR)).toBe('1 kg Silver');
    expect(coinTileBadge(LIVE[0])).toBeNull();
  });
  it('formats weights', () => {
    expect(weightLabel('1oz')).toBe('1 oz');
    expect(weightLabel('', 0.1)).toBe('1/10 oz');
    expect(weightLabel('', 32.1507)).toBe('1 kg');
    expect(weightLabel('', 1.6075)).toBe('50 g');
    expect(weightLabel(undefined, undefined)).toBeUndefined();
  });
  it('lists coin specs only', () => {
    const rows = coinSpecRows(PENNY).map((r) => r.label);
    expect(rows).toEqual(['Type', 'Year', 'Denomination', 'Country', 'Grading', 'Cert number']);
    expect(coinSpecRows(GOLD).find((r) => r.label === 'Metal')?.href).toBe('/coins/browse?metal=gold');
  });
});
