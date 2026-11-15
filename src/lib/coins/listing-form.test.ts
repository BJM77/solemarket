import { describe, it, expect } from 'vitest';
import { buildCoinListingData, type CoinFormValues } from './listing-form';

const base: CoinFormValues = {
  kind: 'coin', subCategory: 'Australian Coins', title: '1930 Australian Penny', year: '1930', denomination: '1 penny',
  country: 'Australia', mint: 'Melbourne Mint', metal: 'Bronze', weight: '', purity: '', condition: 'Circulated',
  gradingCompany: 'Raw', grade: '', certNumber: '', price: '25000', quantity: '1', description: 'Nice', allowLocalPickup: true,
};

describe('coins sell form', () => {
  it('builds a Coins listing on the coins storefront', () => {
    const { data, errors } = buildCoinListingData(base);
    expect(errors).toEqual({});
    expect(data).toMatchObject({ category: 'Coins', subCategory: 'Australian Coins', storefrontId: 'coins', year: 1930, price: 25000, metal: 'Bronze', brand: 'Melbourne Mint', acceptsPayId: true });
    expect(data).not.toHaveProperty('grade');
  });
  it('builds a Bullion listing and requires metal and weight', () => {
    const bad = buildCoinListingData({ ...base, kind: 'bullion', subCategory: 'Gold Bullion', metal: 'Bronze', weight: '' });
    expect(bad.data).toBeNull();
    expect(bad.errors.metal).toBeTruthy();
    expect(bad.errors.weight).toBeTruthy();
    const ok = buildCoinListingData({ ...base, kind: 'bullion', subCategory: 'Silver Bullion', title: '1 oz Perth Mint Kookaburra', metal: 'Silver', weight: '1 oz', purity: '.9999', price: '95' });
    expect(ok.data).toMatchObject({ category: 'Bullion', subCategory: 'Silver Bullion', storefrontId: 'coins', weight: '1 oz', purity: '.9999' });
  });
  it('validates price, title, year and grade', () => {
    const { errors } = buildCoinListingData({ ...base, title: 'x', price: '0', year: '30000', gradingCompany: 'PCGS', grade: '' });
    expect(Object.keys(errors).sort()).toEqual(['grade', 'price', 'title', 'year']);
  });
});
