import { describe, it, expect } from 'vitest';
import { hasKeyword, isBasketballSneaker, isNonBasketballSportCard } from './sports-lifestyle';

const p = (o: any) => ({ title: '', category: 'Sneakers', ...o }) as any;

describe('sports-lifestyle', () => {
  it('matches whole words only', () => {
    expect(hasKeyword('nike kd 16', ['kd'])).toBe(true);
    expect(hasKeyword('lakdown edition', ['kd'])).toBe(false);
    expect(hasKeyword('card #f12', ['f1'])).toBe(false);
    expect(hasKeyword('formula 1 topps', ['formula 1'])).toBe(true);
  });
  it('tags basketball sneakers', () => {
    expect(isBasketballSneaker(p({ title: 'Air Jordan 1 Chicago' }))).toBe(true);
    expect(isBasketballSneaker(p({ title: 'Adidas Samba OG' }))).toBe(false);
  });
  it('never treats coins or cards as sneakers', () => {
    expect(isBasketballSneaker(p({ title: 'Kangaroo 1oz', category: 'Coins' }))).toBe(false);
  });
  it('spots other sports cards', () => {
    expect(isNonBasketballSportCard(p({ title: '2023 Topps Chrome Baseball', category: 'Collector Cards' }))).toBe(true);
    expect(isNonBasketballSportCard(p({ title: 'Prizm Wembanyama Silver', category: 'Collector Cards' }))).toBe(false);
  });
});
