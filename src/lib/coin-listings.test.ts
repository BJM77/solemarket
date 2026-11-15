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

import { isBullionListing, normaliseCoinSubCategory, coinListingClassification, matchesCoinFlags, onlyCoins } from './coin-listings';
import { getProductUrl } from './utils/url';

describe('coins storefront separation', () => {
  // The three live coin listings as they are in Firestore today (no storefrontId).
  const LIVE = [
    { id: 'jfg1MNbwSkdLTzGvFMMv', title: '2023 Australian $2 Vietnam War 50th Anniversary Carded Coin', category: 'Coins', subCategory: 'Australian Coins', model: '$2' },
    { id: 'YLcjJBGSjBCMArOSUrAX', title: '2022 $2 Team Australia Commonwealth Games Coloured Coin', category: 'Coins', subCategory: 'Australian Coins', model: '$2' },
    { id: 'HD4BfzBrBhO0J1CMynEi', title: '2022 Australian Commonwealth Games Team $2 Coin', category: 'Coins', condition: 'Aluminium Bronze' },
  ];
  const BASKETBALL = [
    { id: 'a', title: 'LeBron Prizm', category: 'Collector Cards', subCategory: 'Basketball Cards' },
    { id: 'b', title: 'Jordan 1', category: 'Sneakers', subCategory: 'Jordan' },
    { id: 'c', title: 'Charizard', category: 'Collector Cards', subCategory: 'Pokémon' },
  ];

  it('treats the existing coin listings as coins and gives them /coins URLs', () => {
    for (const p of LIVE) {
      expect(isCoinListing(p)).toBe(true);
      expect(getProductUrl(p)).toMatch(new RegExp(`^/coins/.+/${p.id}$`));
    }
  });
  it('never mixes the two storefronts', () => {
    const all = [...LIVE, ...BASKETBALL];
    expect(withoutCoins(all).map((p) => p.id)).toEqual(['a', 'b', 'c']);
    expect(onlyCoins(all).map((p) => p.id)).toEqual(LIVE.map((p) => p.id));
    expect(all.filter((p) => matchesCoinFlags(p, { coinsOnly: true })).map((p) => p.id)).toEqual(LIVE.map((p) => p.id));
    expect(all.every((p) => matchesCoinFlags(p, {}))).toBe(true);
    for (const p of BASKETBALL) expect(getProductUrl(p)).not.toMatch(/^\/coins/);
  });
  it('detects bullion and filters coins vs bullion', () => {
    const bar = { category: 'Bullion', subCategory: 'Gold Bullion' };
    const legacyBar = { category: 'Coins', subCategory: 'Silver Bullion' };
    expect(isBullionListing(bar)).toBe(true);
    expect(isBullionListing(legacyBar)).toBe(true);
    expect(isBullionListing(LIVE[0])).toBe(false);
    expect(isBullionListing({ category: 'Collector Cards', subCategory: 'Gold Prizm' })).toBe(false);
    expect(matchesCoinFlags(bar, { coinsOnly: true, coinType: 'bullion' })).toBe(true);
    expect(matchesCoinFlags(LIVE[0], { coinsOnly: true, coinType: 'bullion' })).toBe(false);
    expect(matchesCoinFlags(LIVE[0], { coinsOnly: 'true', coinType: 'coins' })).toBe(true);
    expect(isCoinListing({ category: 'Bullion' })).toBe(true);
    expect(getProductUrl({ id: 'z', title: '1oz bar', category: 'Bullion' })).toBe('/coins/1oz-bar/z');
    expect(getProductUrl({ id: 'y', title: 'x', category: 'General', storefrontId: 'coins' })).toBe('/coins/x/y');
  });
  it('normalises sub-categories from sellers, CoinCam and AI', () => {
    expect(normaliseCoinSubCategory('australian coins')).toBe('Australian Coins');
    expect(normaliseCoinSubCategory('Gold', { title: '1 oz Perth Mint Kangaroo gold bullion coin' })).toBe('Gold Bullion');
    expect(normaliseCoinSubCategory('', { title: '1kg silver bar' })).toBe('Silver Bullion');
    expect(normaliseCoinSubCategory('Bank Notes')).toBe('Banknotes');
    expect(normaliseCoinSubCategory('Proof Sets')).toBe('Proof & Mint Sets');
    expect(normaliseCoinSubCategory('', { country: 'New Zealand' })).toBe('World Coins');
    expect(normaliseCoinSubCategory(undefined)).toBe('Australian Coins');
    expect(normaliseCoinSubCategory('$$2')).toBe('Australian Coins');
  });
  it('classifies new listings consistently', () => {
    expect(coinListingClassification({ subCategory: 'Australian Coins' })).toEqual({ category: 'Coins', subCategory: 'Australian Coins', storefrontId: 'coins' });
    expect(coinListingClassification({ subCategory: 'Gold Bullion' })).toEqual({ category: 'Bullion', subCategory: 'Gold Bullion', storefrontId: 'coins' });
    expect(coinListingClassification({ isBullion: true, metal: 'Silver' })).toEqual({ category: 'Bullion', subCategory: 'Silver Bullion', storefrontId: 'coins' });
  });
});
