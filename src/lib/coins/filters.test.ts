import { describe, it, expect } from 'vitest';
import { coinFacets, parsePurity, parseWeightOz, parseMetal, normaliseDenomination } from './facets';
import {
  parseCoinFilters, coinFiltersToParams, coinsBrowseHref, matchesCoinFilters, applyCoinFilters, sortCoinListings,
  availableCoinSorts, effectiveCoinSort, coinFacetOptions, coinFilterChips, removeCoinChip, premiumOverSpot,
  pricePerFineOz, spotMapFrom, activeCoinFilterCount, coinsBrowseHeading,
} from './filters';

// The three live coin listings as they are in Firestore today (no metal/weight/storefrontId).
const LIVE = [
  { id: 'jfg1MNbwSkdLTzGvFMMv', title: '2023 Australian $2 Vietnam War 50th Anniversary Carded Coin', category: 'Coins', subCategory: 'Australian Coins', model: '$$2', price: 15, createdAt: '2026-11-01T00:00:00Z' },
  { id: 'YLcjJBGSjBCMArOSUrAX', title: '2022 $2 Team Australia Commonwealth Games Coloured Coin', category: 'Coins', subCategory: 'Australian Coins', model: '$$2', price: 12, createdAt: '2026-11-02T00:00:00Z' },
  { id: 'HD4BfzBrBhO0J1CMynEi', title: '2022 Australian Commonwealth Games Team $2 Coin', category: 'Coins', condition: 'Aluminium Bronze', price: 10, createdAt: '2026-11-03T00:00:00Z' },
];
// Listings as the coins sell form saves them.
const GOLD = { id: 'g', title: '2024 1 oz Perth Mint Kangaroo Gold Coin', category: 'Bullion', subCategory: 'Gold Bullion', storefrontId: 'coins', metal: 'Gold', weight: '1 oz', purity: '.9999', year: 2024, mint: 'Perth Mint', country: 'Australia', condition: 'Brilliant Uncirculated', gradingCompany: 'Raw', price: 6400, createdAt: '2026-11-10T00:00:00Z' };
const SILVER = { id: 's', title: '1 kg Perth Mint Silver Cast Bar', category: 'Bullion', subCategory: 'Silver Bullion', metal: 'Silver', weight: '1 kg', purity: '99.9%', mint: 'Perth Mint', country: 'Australia', price: 3300, createdAt: '2026-11-11T00:00:00Z' };
const SILVER_OZ = { id: 's1', title: '2025 Kookaburra 1oz Silver', category: 'Bullion', subCategory: 'Silver Bullion', metal: 'Silver', weight: '31.1g', purity: '999', price: 98, createdAt: '2026-11-12T00:00:00Z' };
const PENNY = { id: 'p', title: '1930 Australian Penny', category: 'Coins', subCategory: 'Australian Coins', year: 1930, denomination: '1 penny', metal: 'Bronze', mint: 'Melbourne Mint', country: 'Australia', condition: 'Circulated', gradingCompany: 'PCGS', grade: 'VF35', certNumber: '123', price: 25000, createdAt: '2026-10-01T00:00:00Z' };
const NOTE = { id: 'n', title: '1966 $1 Banknote Coombs/Wilson', category: 'Coins', subCategory: 'Banknotes', year: 1966, country: 'Australia', price: 40, createdAt: '2026-10-05T00:00:00Z' };
const ALL = [...LIVE, GOLD, SILVER, SILVER_OZ, PENNY, NOTE];
const SPOT = { gold: 6100, silver: 90, platinum: 2550, palladium: 1800 };

describe('coin facts', () => {
  it('reads the sell-form fields', () => {
    const f = coinFacets(GOLD);
    expect(f).toMatchObject({ kind: 'bullion', metal: 'gold', weightOz: 1, purity: 0.9999, year: 2024, mint: 'Perth Mint', country: 'Australia', graded: false });
    expect(f.fineOz).toBeCloseTo(0.9999, 4);
    expect(coinFacets(PENNY)).toMatchObject({ kind: 'coin', metal: 'base', graded: true, gradingCompany: 'PCGS', grade: 'VF35', gradeNumber: 35, denomination: '1 penny' });
    expect(coinFacets(NOTE).kind).toBe('banknote');
  });
  it('degrades gracefully for the legacy $2 listings', () => {
    const [a, b, c] = LIVE.map((p) => coinFacets(p));
    expect(a).toMatchObject({ kind: 'coin', year: 2023, country: 'Australia', denomination: '$2', graded: false });
    expect(a.metal).toBeUndefined();
    expect(a.weightOz).toBeUndefined();
    expect(b.denomination).toBe('$2');
    // Metal stored in the condition field: it is the metal, not a condition.
    expect(c).toMatchObject({ metal: 'base', condition: undefined, country: 'Australia', year: 2022, denomination: '$2' });
  });
  it('parses weights, purity, metals and denominations', () => {
    expect(parseWeightOz('1/10 oz')).toBeCloseTo(0.1);
    expect(parseWeightOz('31.1g')).toBeCloseTo(1, 2);
    expect(parseWeightOz('1kg')).toBeCloseTo(32.15, 1);
    expect(parseWeightOz('heavy')).toBeUndefined();
    expect(parsePurity('.9999')).toBe(0.9999);
    expect(parsePurity('99.99%')).toBeCloseTo(0.9999);
    expect(parsePurity('999')).toBe(0.999);
    expect(parsePurity('9999')).toBe(0.9999);
    expect(parsePurity('22k')).toBeCloseTo(0.9167, 3);
    expect(parsePurity('sterling')).toBe(0.925);
    expect(parsePurity('100 years of Holden')).toBeUndefined();
    expect(parseMetal('Aluminium Bronze')).toBe('base');
    expect(parseMetal('Cupronickel')).toBe('base');
    expect(parseMetal('Fine Silver')).toBe('silver');
    expect(parseMetal('AU58')).toBeUndefined();
    expect(normaliseDenomination('$$2')).toBe('$2');
    expect(normaliseDenomination('', '1966 50 cents round')).toBe('50c');
    expect(normaliseDenomination('', '1930 Australian Penny')).toBe('Penny');
  });
});

describe('coin filters', () => {
  it('round-trips URL params and ignores junk', () => {
    const f = parseCoinFilters(new URLSearchParams('q=kangaroo&coinType=bullion&metal=gold,silver,zinc&weight=1&purity=0.999&yearMin=2000&yearMax=1800&country=Australia&graded=graded&grader=PCGS&gradeMin=65&priceMin=50&priceMax=abc&sort=premium-asc&subCategory=Nope'));
    expect(f).toEqual({ q: 'kangaroo', coinType: 'bullion', metals: ['gold', 'silver'], weight: '1', purityMin: 0.999, yearMin: 2000, yearMax: 1800, country: 'Australia', graded: 'graded', grader: 'PCGS', gradeMin: 65, priceMin: 50, sort: 'premium-asc' });
    expect(parseCoinFilters(coinFiltersToParams(f))).toEqual(f);
    expect(parseCoinFilters({ metal: 'gold', sort: 'newest' })).toEqual({ metals: ['gold'] });
    expect(coinsBrowseHref({})).toBe('/coins/browse');
    expect(coinsBrowseHref({ coinType: 'bullion', metals: ['gold'] })).toBe('/coins/browse?coinType=bullion&metal=gold');
  });
  it('has no basketball filters', () => {
    const f = parseCoinFilters(new URLSearchParams('sizes=10&player=LeBron&team=Lakers&brand=Nike&gradingCompanies=PSA'));
    expect(f).toEqual({});
  });
  it('filters by type, metal, weight, purity, year, country, mint, denomination, grading and price', () => {
    const ids = (f: Parameters<typeof matchesCoinFilters>[1]) => ALL.filter((p) => matchesCoinFilters(p, f)).map((p) => p.id);
    expect(ids({ coinType: 'bullion' })).toEqual(['g', 's', 's1']);
    expect(ids({ coinType: 'banknotes' })).toEqual(['n']);
    expect(ids({ coinType: 'coins' })).toEqual([...LIVE.map((p) => p.id), 'p']);
    expect(ids({ metals: ['silver'] })).toEqual(['s', 's1']);
    expect(ids({ metals: ['base'] })).toEqual(['HD4BfzBrBhO0J1CMynEi', 'p']);
    expect(ids({ weight: '1' })).toEqual(['g', 's1']);
    expect(ids({ weight: '10+' })).toEqual(['s']);
    expect(ids({ purityMin: 0.9999 })).toEqual(['g']);
    expect(ids({ yearMin: 2022, yearMax: 2023 })).toEqual(LIVE.map((p) => p.id));
    expect(ids({ yearMax: 1950 })).toEqual(['p']);
    expect(ids({ country: 'australia', coinType: 'coins' })).toEqual([...LIVE.map((p) => p.id), 'p']);
    expect(ids({ mint: 'Perth Mint' })).toEqual(['g', 's']);
    expect(ids({ denomination: '$2' })).toEqual(LIVE.map((p) => p.id));
    expect(ids({ graded: 'graded' })).toEqual(['p']);
    expect(ids({ graded: 'raw', coinType: 'bullion' })).toEqual(['g', 's', 's1']);
    expect(ids({ grader: 'pcgs', gradeMin: 30 })).toEqual(['p']);
    expect(ids({ gradeMin: 40 })).toEqual([]);
    expect(ids({ conditions: ['Circulated'] })).toEqual(['p']);
    expect(ids({ priceMin: 11, priceMax: 100 })).toEqual(['jfg1MNbwSkdLTzGvFMMv', 'YLcjJBGSjBCMArOSUrAX', 's1', 'n']);
    expect(ids({ q: 'vietnam $2' })).toEqual(['jfg1MNbwSkdLTzGvFMMv']);
  });
  it('builds filter options from the listings themselves', () => {
    const o = coinFacetOptions(ALL);
    expect(o.metals.map((m) => m.value)).toEqual(['gold', 'silver', 'base']);
    expect(o.countries[0]).toMatchObject({ value: 'Australia' });
    expect(o.denominations.map((d) => d.value)).toContain('$2');
    expect(o.graders.map((g) => g.value)).toEqual(['PCGS']);
    expect(o.years).toEqual({ min: 1930, max: 2025 });
    expect(o.anyFineWeight).toBe(true);
    const legacy = coinFacetOptions(LIVE);
    expect(legacy.metals.map((m) => m.value)).toEqual(['base']);
    expect(legacy.anyFineWeight).toBe(false);
    expect(legacy.anyGraded).toBe(false);
  });
  it('makes removable chips and counts active filters', () => {
    const f = { metals: ['gold', 'silver'] as ('gold' | 'silver')[], yearMin: 2000, priceMax: 500, sort: 'price-asc' as const, coinType: 'bullion' as const };
    const chips = coinFilterChips(f);
    expect(chips.map((c) => c.label)).toEqual(['Gold', 'Silver', '2000 or later', 'Under $500']);
    expect(activeCoinFilterCount(f)).toBe(3);
    expect(removeCoinChip(f, chips[0]).metals).toEqual(['silver']);
    expect(removeCoinChip(removeCoinChip(f, chips[0]), chips[1]).metals).toBeUndefined();
    expect(removeCoinChip(f, chips[3]).priceMax).toBeUndefined();
    expect(coinsBrowseHeading({ coinType: 'banknotes' })).toBe('Banknotes');
  });
});

describe('coin sorts', () => {
  it('sorts newest, by price and by year', () => {
    expect(sortCoinListings(LIVE).map((p) => p.id)).toEqual(['HD4BfzBrBhO0J1CMynEi', 'YLcjJBGSjBCMArOSUrAX', 'jfg1MNbwSkdLTzGvFMMv']);
    expect(sortCoinListings(ALL, 'price-asc').map((p) => p.price)).toEqual([10, 12, 15, 40, 98, 3300, 6400, 25000]);
    expect(sortCoinListings(ALL, 'price-desc')[0].id).toBe('p');
    expect(sortCoinListings(ALL, 'year-asc').map((p) => p.id).slice(0, 2)).toEqual(['p', 'n']);
    // Silver bar has no year: it goes last.
    expect(sortCoinListings(ALL, 'year-desc').at(-1)!.id).toBe('s');
  });
  it('sorts bullion by price per fine oz and premium over spot; unknowns go last', () => {
    const ppo = sortCoinListings(ALL, 'ppo-asc').map((p) => p.id);
    // 1 oz silver ~$98/oz, 1 kg bar ~$103/oz, gold ~$6,400/oz.
    expect(ppo.slice(0, 3)).toEqual(['s1', 's', 'g']);
    const g = coinFacets(GOLD);
    expect(pricePerFineOz(g)).toBeCloseTo(6400 / 0.9999, 2);
    expect(premiumOverSpot(g, SPOT)).toBeCloseTo(6400 / (0.9999 * 6100) - 1, 4);
    expect(premiumOverSpot(coinFacets(LIVE[0]), SPOT)).toBeUndefined();
    const prem = sortCoinListings(ALL, 'premium-asc', SPOT).map((p) => p.id);
    // Gold ~4.9% over spot, 1 oz silver ~9%, silver bar ~14%.
    expect(prem.slice(0, 3)).toEqual(['g', 's1', 's']);
  });
  it('only offers premium when spot prices are available, and price per oz when weights are known', () => {
    const values = (o: ReturnType<typeof availableCoinSorts>) => o.map((x) => x.value);
    expect(values(availableCoinSorts({ spot: SPOT, anyFineWeight: true }))).toContain('premium-asc');
    expect(values(availableCoinSorts({ spot: null, anyFineWeight: true }))).not.toContain('premium-asc');
    expect(values(availableCoinSorts({ spot: null, anyFineWeight: true }))).toContain('ppo-asc');
    expect(values(availableCoinSorts({ spot: SPOT, anyFineWeight: false }))).toEqual(['newest', 'price-asc', 'price-desc', 'year-asc', 'year-desc']);
    expect(effectiveCoinSort('premium-asc', { spot: null, anyFineWeight: true })).toBe('newest');
    expect(applyCoinFilters(LIVE, { sort: 'premium-asc' }, SPOT).map((p) => p.id)).toEqual(sortCoinListings(LIVE).map((p) => p.id));
  });
  it('reads spot quotes', () => {
    expect(spotMapFrom({ quotes: [{ metal: 'gold', audPerOz: 6100 }, { metal: 'silver', audPerOz: 90 }] })).toEqual({ gold: 6100, silver: 90 });
    expect(spotMapFrom(null)).toBeNull();
  });
});
