import { describe, expect, it } from 'vitest';
import { listingSeoTitle, listingSeoDescription, schemaBrand, schemaSeller, LISTING_TITLE_MAX } from './listing-seo';

describe('listingSeoTitle', () => {
  it('drops specs the title already says and raw condition words', () => {
    expect(listingSeoTitle({ title: '2024 Panini Prizm Deep Space LeBron James #5', year: 2024, brand: 'Panini Prizm Deep Space', cardNumber: '5', condition: 'Near Mint' } as any))
      .toBe('2024 Panini Prizm Deep Space LeBron James #5');
  });
  it('adds set/year to short titles and the slab grade', () => {
    expect(listingSeoTitle({ title: 'Chet Holmgren', year: 2023, brand: 'Panini Prizm', gradingCompany: 'PSA', grade: '10', condition: 'Near Mint' } as any))
      .toBe('Chet Holmgren – 2023 Panini Prizm PSA 10');
  });
  it('trims long titles on a word boundary', () => {
    const t = listingSeoTitle({ title: '2024-25 Panini Donruss Optic Pacôme Dadiet Rated Rookie Holo Silver Prizm #264', cardNumber: '264' } as any);
    expect(t.length).toBeLessThanOrEqual(LISTING_TITLE_MAX);
    expect(t.endsWith('…')).toBe(true);
    expect(t).not.toMatch(/\s…$/);
  });
  it('keeps sneaker titles without condition noise', () => {
    expect(listingSeoTitle({ title: 'Nike Kyrie 7 Play for the Future', year: 2021, brand: 'Nike', condition: 'Good' } as any))
      .toBe('Nike Kyrie 7 Play for the Future – 2021');
  });
  it('formats transactional sneaker titles with size and AUD price', () => {
    expect(listingSeoTitle({
      title: 'Kobe 6 Protro Reverse Grinch',
      category: 'Sneakers',
      brand: 'Nike',
      size: '11',
      price: 450,
    } as any)).toBe('Nike Kobe 6 Protro Reverse Grinch (Size US 11) – $450 AUD');
  });
});

describe('listingSeoDescription', () => {
  it('includes size, condition, price, and seller location for sneakers', () => {
    const desc = listingSeoDescription(
      {
        title: 'Nike Kobe 6 Protro Reverse Grinch',
        category: 'Sneakers',
        size: '11',
        condition: 'New with Box',
        price: 450,
      } as any,
      { location: 'Perth, WA' },
    );
    expect(desc).toContain('Size US 11');
    expect(desc).toContain('New with Box');
    expect(desc).toContain('$450 AUD');
    expect(desc).toContain('Perth, WA');
  });
});

describe('schemaBrand', () => {
  it('uses the maker, not the set name', () => {
    expect(schemaBrand({ brand: 'Panini Prizm Deep Space' } as any)).toBe('Panini');
    expect(schemaBrand({ brand: 'Pokémon Obsidian Flames' } as any)).toBe('Pokémon');
    expect(schemaBrand({ brand: 'Donruss Optic' } as any)).toBe('Panini');
    expect(schemaBrand({ manufacturer: 'Topps', brand: 'Chrome' } as any)).toBe('Topps');
    expect(schemaBrand({ title: 'Air Jordan 4 Retro Military Blue' } as any)).toBe('Jordan');
    expect(schemaBrand({ title: '2023 Panini Prizm Chet Holmgren' } as any)).toBe('Panini');
    expect(schemaBrand({ brand: 'Mystery Box', title: 'Mystery Box' } as any)).toBeNull();
  });
});

describe('schemaSeller', () => {
  it('names the real seller and skips placeholders', () => {
    expect(schemaSeller({ storeName: 'Courtside Cards' }, 'https://benched.au', 'u1')).toEqual({ '@type': 'Organization', name: 'Courtside Cards', url: 'https://benched.au/seller/u1' });
    expect(schemaSeller({ displayName: 'Sam' }, 'https://benched.au')).toEqual({ '@type': 'Person', name: 'Sam' });
    expect(schemaSeller({ displayName: 'Unknown Seller' }, 'https://benched.au')).toBeNull();
    expect(schemaSeller(null, 'https://benched.au')).toBeNull();
  });
});
