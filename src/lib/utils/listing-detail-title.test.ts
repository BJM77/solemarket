import { describe, it, expect } from 'vitest';
import { listingDetailTitle } from './listing-detail-title';

describe('listingDetailTitle', () => {
  describe('cards', () => {
    it('uses year + brand on row 1 and remaining fields on row 2', () => {
      expect(listingDetailTitle({
        title: '2024 Panini Donruss Optic OG Anunoby Red Laser #123',
        category: 'Collector Cards',
        year: 2024,
        brand: 'Panini',
        set: 'Donruss Optic',
        player: 'OG Anunoby',
        parallel: 'Red Laser',
        cardNumber: '123',
      })).toEqual({
        row1: '2024 Panini',
        row2: 'Donruss Optic OG Anunoby Red Laser #123',
      });
    });

    it('uses model as the set when set is missing and does not double hash the card number', () => {
      expect(listingDetailTitle({
        title: '2023 Panini Prizm Victor Wembanyama #136 Silver RC',
        category: 'Collector Cards',
        year: 2023,
        brand: 'Panini',
        model: 'Prizm',
        player: 'Victor Wembanyama',
        cardNumber: '#136',
        parallel: 'Silver',
      })).toEqual({
        row1: '2023 Panini',
        row2: 'Prizm Victor Wembanyama Silver #136',
      });
    });

    it('accepts manufacturer, playerName and a season-style year', () => {
      expect(listingDetailTitle({
        title: '2023-24 Panini Prizm Victor Wembanyama RC',
        category: 'Trading Cards',
        year: '2023-24',
        manufacturer: 'Panini',
        playerName: 'Victor Wembanyama',
        set: 'Prizm',
      })).toEqual({
        row1: '2023-24 Panini',
        row2: 'Prizm Victor Wembanyama',
      });
    });

    it('parses year and brand from the title when fields are missing', () => {
      expect(listingDetailTitle({
        title: '2024 Panini Donruss Optic OG Anunoby Red Laser #123',
        category: 'Collector Cards',
      })).toEqual({
        row1: '2024 Panini',
        row2: 'Donruss Optic OG Anunoby Red Laser #123',
      });
      expect(listingDetailTitle({
        title: '2003 Topps LeBron James Rookie',
        category: 'Cards',
      })).toEqual({
        row1: '2003 Topps',
        row2: 'LeBron James Rookie',
      });
    });

    it('combines a year field with a brand parsed from the title', () => {
      expect(listingDetailTitle({
        title: 'Panini Prizm Jayson Tatum #8',
        category: 'Collector Cards',
        year: 2024,
      })).toEqual({
        row1: '2024 Panini',
        row2: 'Prizm Jayson Tatum #8',
      });
    });
  });

  describe('shoes', () => {
    it('uses brand + model on row 1 and colorway on row 2', () => {
      expect(listingDetailTitle({
        title: "Nike Kyrie 7 'Play for the Future' US 11 Deadstock",
        category: 'Sneakers',
        brand: 'Nike',
        model: 'Kyrie 7',
        colorway: 'Play for the Future',
      })).toEqual({
        row1: 'Nike Kyrie 7',
        row2: 'Play for the Future',
      });
    });

    it('does not duplicate brand when the model already includes it', () => {
      expect(listingDetailTitle({
        title: "Air Jordan 11 'Cool Grey'",
        category: 'Sneakers',
        brand: 'Jordan',
        model: 'Jordan 11',
        colorway: 'Cool Grey',
      })).toEqual({
        row1: 'Jordan 11',
        row2: 'Cool Grey',
      });
    });

    it('falls back to detectedAttributes when top-level fields are missing', () => {
      expect(listingDetailTitle({
        title: 'Kobe listed without brand',
        category: 'Sneakers',
        detectedAttributes: { brand: 'Nike', model: 'Kobe 6 Protro', colorway: 'Grinch' },
      })).toEqual({
        row1: 'Nike Kobe 6 Protro',
        row2: 'Grinch',
      });
    });

    it('parses brand, model and a quoted colourway from the title', () => {
      expect(listingDetailTitle({
        title: "Nike Kyrie 7 'Play for the Future' US 11 Deadstock",
        category: 'Sneakers',
      })).toEqual({
        row1: 'Nike Kyrie 7',
        row2: 'Play for the Future',
      });
      expect(listingDetailTitle({
        title: "Nike Dunk Low 'Panda'",
        category: 'Shoes',
      })).toEqual({
        row1: 'Nike Dunk Low',
        row2: 'Panda',
      });
      expect(listingDetailTitle({
        title: 'Nike LeBron 22',
        category: 'Sneakers',
      })).toEqual({
        row1: 'Nike LeBron 22',
        row2: '',
      });
    });

    it('stops the model at a known colourway word and uses the rest as row 2', () => {
      expect(listingDetailTitle({
        title: 'Nike Kobe 6 Protro Grinch',
        category: 'Sneakers',
      })).toEqual({
        row1: 'Nike Kobe 6 Protro',
        row2: 'Grinch',
      });
    });
  });

  describe('fallback', () => {
    it('puts the full title on row 1 when nothing useful can be derived', () => {
      expect(listingDetailTitle({
        title: 'Mystery Box Lot of 12',
        category: 'General',
      })).toEqual({
        row1: 'Mystery Box Lot of 12',
        row2: '',
      });
    });

    it('returns empty rows when there is no title or fields', () => {
      expect(listingDetailTitle({})).toEqual({ row1: '', row2: '' });
    });
  });
});
