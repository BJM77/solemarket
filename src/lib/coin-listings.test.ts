import { describe, it, expect } from 'vitest';
import { isCoinListing, withoutCoins, isCoinsHref, isCoinsPath, isCoinValue } from './coin-listings';

describe('coin listings', () => {
  it('matches the coin categories and sub-categories in use', () => {
    expect(isCoinListing({ category: 'Coins' })).toBe(true);
    expect(isCoinListing({ category: 'coins' })).toBe(true);
    expect(isCoinListing({ category: 'Numismatics' })).toBe(true);
    expect(isCoinListing({ category: 'General', subCategory: 'Australian Coins' })).toBe(true);
    expect(isCoinListing({ category: 'General', subCategory: 'Gold Bullion' })).toBe(true);
    expect(isCoinListing({ category: 'General', subCategory: 'Banknotes' })).toBe(true);
    expect(isCoinListing({ storefrontId: 'coins' })).toBe(true);
  });
  it('leaves basketball cards and sneakers alone', () => {
    expect(isCoinListing({ category: 'Collector Cards', subCategory: 'Rookies' })).toBe(false);
    expect(isCoinListing({ category: 'Sneakers', subCategory: 'Jordan' })).toBe(false);
    expect(isCoinListing({ category: 'Collector Cards', subCategory: 'Gold Prizm Parallels' })).toBe(false);
    expect(isCoinValue('Kings')).toBe(false);
    expect(isCoinListing(null)).toBe(false);
    expect(withoutCoins([{ category: 'Coins' }, { category: 'Sneakers' }])).toEqual([{ category: 'Sneakers' }]);
  });
  it('spots links into the coins section', () => {
    expect(isCoinsHref('/coins')).toBe(true);
    expect(isCoinsHref('/coins?subCategory=Gold')).toBe(true);
    expect(isCoinsHref('/coins/1930-penny')).toBe(true);
    expect(isCoinsHref('https://benched.au/coins')).toBe(true);
    expect(isCoinsHref('/browse?category=Coins')).toBe(true);
    expect(isCoinsHref('/coincam')).toBe(false);
    expect(isCoinsHref('/cards')).toBe(false);
    expect(isCoinsHref(undefined)).toBe(false);
  });
  it('knows which paths redirect', () => {
    expect(isCoinsPath('/coins')).toBe(true);
    expect(isCoinsPath('/coins/abc/123')).toBe(true);
    expect(isCoinsPath('/coincam')).toBe(false);
    expect(isCoinsPath('/coinsx')).toBe(false);
  });
});
