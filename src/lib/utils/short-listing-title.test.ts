import { describe, it, expect } from 'vitest';
import { shortListingTitle, formatShoeSizeBadge } from './short-listing-title';

describe('shortListingTitle', () => {
  describe('shoes', () => {
    it('uses brand + model fields (Nike Kyrie 7, Nike LeBron 22)', () => {
      expect(shortListingTitle({
        title: "Nike Kyrie 7 'Sisterhood' US 11 Deadstock",
        category: 'Sneakers',
        brand: 'Nike',
        model: 'Kyrie 7',
      })).toBe('Nike Kyrie 7');
      expect(shortListingTitle({
        title: 'Nike LeBron 22 Currency Size 12',
        category: 'Sneakers',
        brand: 'Nike',
        model: 'LeBron 22',
      })).toBe('Nike LeBron 22');
    });

    it('does not duplicate brand when the model already includes it', () => {
      expect(shortListingTitle({
        title: 'Air Jordan 11 Cool Grey',
        category: 'Sneakers',
        brand: 'Jordan',
        model: 'Jordan 11',
      })).toBe('Jordan 11');
    });

    it('falls back to detectedAttributes when top-level fields are missing', () => {
      expect(shortListingTitle({
        title: 'Kobe listed without brand',
        category: 'Sneakers',
        detectedAttributes: { brand: 'Nike', model: 'Kobe 6 Protro' },
      })).toBe('Nike Kobe 6 Protro');
    });

    it('parses brand + model from the title when fields are missing', () => {
      expect(shortListingTitle({
        title: "Nike Kyrie 7 'Sisterhood' US 11 Deadstock",
        category: 'Sneakers',
      })).toBe('Nike Kyrie 7');
      expect(shortListingTitle({
        title: "Nike Dunk Low 'Panda'",
        category: 'Shoes',
      })).toBe('Nike Dunk Low');
      expect(shortListingTitle({
        title: 'Nike Kobe 6 Protro Grinch',
        category: 'Sneakers',
      })).toBe('Nike Kobe 6 Protro');
      expect(shortListingTitle({
        title: 'Nike LeBron 22',
        category: 'Sneakers',
      })).toBe('Nike LeBron 22');
    });
  });

  describe('cards', () => {
    it('uses year + player fields (2024 OG Anunoby)', () => {
      expect(shortListingTitle({
        title: '2024 Panini Prizm OG Anunoby #123 Silver PSA 10',
        category: 'Collector Cards',
        year: 2024,
        player: 'OG Anunoby',
      })).toBe('2024 OG Anunoby');
    });

    it('accepts playerName and a season-style year', () => {
      expect(shortListingTitle({
        title: 'Wemby rookie',
        category: 'Trading Cards',
        year: '2023-24',
        playerName: 'Victor Wembanyama',
      })).toBe('2023-24 Victor Wembanyama');
    });

    it('parses year and player from the title when fields are missing', () => {
      expect(shortListingTitle({
        title: '2024 Panini Prizm OG Anunoby #123 Silver',
        category: 'Collector Cards',
      })).toBe('2024 OG Anunoby');
      expect(shortListingTitle({
        title: '2023-24 Prizm Victor Wembanyama RC',
        category: 'Collector Cards',
      })).toBe('2023-24 Victor Wembanyama');
      expect(shortListingTitle({
        title: '2003 Topps LeBron James Rookie',
        category: 'Cards',
      })).toBe('2003 LeBron James');
    });

    it('combines a year field with a player parsed from the title', () => {
      expect(shortListingTitle({
        title: 'Panini Prizm Jayson Tatum #8',
        category: 'Collector Cards',
        year: 2024,
      })).toBe('2024 Jayson Tatum');
    });
  });

  describe('fallback', () => {
    it('returns the full title when nothing useful can be derived', () => {
      expect(shortListingTitle({
        title: 'Mystery Box Lot of 12',
        category: 'General',
      })).toBe('Mystery Box Lot of 12');
    });

    it('returns an empty string when there is no title or fields', () => {
      expect(shortListingTitle({})).toBe('');
    });
  });
});

describe('formatShoeSizeBadge', () => {
  it('normalizes sizes to US11.5 style', () => {
    expect(formatShoeSizeBadge('11.5')).toBe('US11.5');
    expect(formatShoeSizeBadge('US 11.5')).toBe('US11.5');
    expect(formatShoeSizeBadge('US11.5')).toBe('US11.5');
  });

  it('returns null for empty values', () => {
    expect(formatShoeSizeBadge('')).toBeNull();
    expect(formatShoeSizeBadge(null)).toBeNull();
  });
});
