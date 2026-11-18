import { describe, it, expect } from 'vitest';
import { DEFAULT_SUB_CATEGORIES, CATEGORY_TRADING_CARDS } from './marketplace';
import { isTcgValue } from '@/lib/tcg-listings';

describe('basketball card sub-categories', () => {
  it('do not include Pokémon, Yu-Gi-Oh or other TCG names', () => {
    const subs = DEFAULT_SUB_CATEGORIES[CATEGORY_TRADING_CARDS] || [];
    expect(subs.some(isTcgValue)).toBe(false);
    expect(subs).toContain('Basketball');
    expect(subs).toContain('Rookies');
  });
});
