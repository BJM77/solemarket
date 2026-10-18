import { describe, it, expect } from 'vitest';
import { buildCardTitle, buildDraftFields } from './draft';

describe('AutoCard draft fields', () => {
  const wemby = { year: '2023', brand: 'Panini', set: 'Prizm', name: 'Victor Wembanyama', cardNumber: '136', variant: 'Silver Prizm', rookie: true, subCategory: 'Basketball Cards', conditionGuess: 'Near Mint', description: 'Silver Prizm rookie.', keywords: ['Spurs'] };
  it('builds the listing title', () => {
    expect(buildCardTitle(wemby)).toBe('2023 Panini Prizm Victor Wembanyama #136 Silver RC');
  });
  it('maps a raw card, leaving price at 0', () => {
    const d = buildDraftFields(wemby);
    expect(d).toMatchObject({ price: 0, category: 'Collector Cards', subCategory: 'Basketball Cards', brand: 'Panini', model: 'Prizm', year: 2023, cardNumber: '136', player: 'Victor Wembanyama', parallel: 'Silver Prizm', gradingCompany: 'Raw', condition: 'Near Mint', description: 'Silver Prizm rookie.' });
    expect(d.keywords).toEqual(expect.arrayContaining(['spurs', 'victor wembanyama', 'rookie']));
    expect(d.grade).toBeUndefined();
  });
  it('maps a slab', () => {
    expect(buildDraftFields({ name: 'Charizard', brand: 'Pokémon', set: 'Base Set', cardNumber: '4/102', gradingCompany: 'psa', grade: '9' })).toMatchObject({ gradingCompany: 'PSA', grade: '9', condition: 'PSA 9' });
  });
  it('falls back to a plain draft when identification failed', () => {
    expect(buildDraftFields(null)).toEqual({ title: 'Card (AutoCard draft)', price: 0, category: 'Collector Cards', condition: 'Used' });
  });
});
