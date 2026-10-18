import { describe, it, expect } from 'vitest';
import { buildEbayQuery, ebaySoldUrl } from './ebay';

describe('buildEbayQuery', () => {
  it('builds a full sports card query', () => {
    expect(buildEbayQuery({ year: 2019, brand: 'Panini', set: 'Prizm', name: 'Zion Williamson', cardNumber: '#248', variant: 'Silver', gradingCompany: 'psa', grade: 10 }))
      .toBe('2019 Panini Prizm Zion Williamson #248 Silver PSA 10');
  });
  it('drops empty/placeholder fields and raw grades', () => {
    expect(buildEbayQuery({ year: null, brand: 'Pokémon', set: 'Base Set', name: 'Charizard', cardNumber: '4/102', variant: 'none', gradingCompany: 'Raw', grade: 'N/A' }))
      .toBe('Pokémon Base Set Charizard #4/102');
  });
  it('de-duplicates repeated words and strips odd characters', () => {
    expect(buildEbayQuery({ brand: 'Panini', set: 'Panini Prizm', name: 'LeBron James™', cardNumber: '' })).toBe('Panini Prizm LeBron James');
  });
  it('caps the word count', () => {
    expect(buildEbayQuery({ name: 'a b c d e f g h i j k l m n' }).split(' ')).toHaveLength(12);
  });
  it('returns empty when nothing identified', () => {
    expect(buildEbayQuery({})).toBe('');
  });
});

describe('ebaySoldUrl', () => {
  it('targets eBay AU sold + completed with an encoded query', () => {
    expect(ebaySoldUrl('2019 Prizm Zion #248')).toBe('https://www.ebay.com.au/sch/i.html?_nkw=2019%20Prizm%20Zion%20%23248&LH_Sold=1&LH_Complete=1');
  });
});
