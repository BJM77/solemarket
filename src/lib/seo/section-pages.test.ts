import { describe, it, expect } from 'vitest';
import { sectionListings, pageSlice, totalPages, sectionPagePath, parsePageParam, pageWindow } from './section-pages';

const p = (id: string, s: number, extra: Record<string, unknown>) => ({ id, status: 'available', isDraft: false, price: 10, createdAt: { seconds: s }, ...extra }) as any;
const all = [
  p('c1', 1, { title: '2024 Panini Prizm LeBron', category: 'Collector Cards' }),
  p('c2', 3, { title: '2023 Panini Phoenix Wembanyama', category: 'Collector Cards' }),
  p('s1', 2, { title: 'Nike Kobe 6', category: 'Sneakers' }),
  p('t1', 4, { title: '2023 Pokémon Obsidian Flames Absol ex', category: 'Collector Cards', subCategory: 'Pokémon' }),
  p('d1', 5, { title: '2024 Panini Draft', category: 'Collector Cards', isDraft: true }),
];

describe('section pages', () => {
  it('splits sections, keeps TCG on pokemon, newest first', () => {
    expect(sectionListings(all, 'cards').map((x) => x.id)).toEqual(['c2', 'c1']);
    expect(sectionListings(all, 'shoes').map((x) => x.id)).toEqual(['s1']);
    expect(sectionListings(all, 'pokemon').map((x) => x.id)).toEqual(['t1']);
  });
  it('paginates', () => {
    const items = Array.from({ length: 50 }, (_, i) => i);
    expect(totalPages(50)).toBe(3);
    expect(totalPages(0)).toBe(1);
    expect(pageSlice(items, 3)).toEqual([48, 49]);
  });
  it('builds paths and parses params', () => {
    expect(sectionPagePath('cards', 1)).toBe('/cards');
    expect(sectionPagePath('shoes', 3)).toBe('/shoes/page/3');
    expect(parsePageParam('2')).toBe(2);
    expect(parsePageParam('1')).toBeNull();
    expect(parsePageParam('02')).toBeNull();
    expect(parsePageParam('x')).toBeNull();
  });
  it('windows page numbers', () => {
    expect(pageWindow(1, 3)).toEqual([1, 2, 3]);
    expect(pageWindow(6, 12)).toEqual([1, null, 4, 5, 6, 7, 8, null, 12]);
  });
});
