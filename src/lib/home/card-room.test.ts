import { describe, it, expect } from 'vitest';
import { CARD_ROOM_COUNT, DEFAULT_CARD_ROOM_ITEMS, completeCardRoomItems } from './card-room';
import { parseFilterSearchParams } from '@/lib/filters/params';
import { MARKETPLACE_CATEGORIES } from '@/config/categories';

describe('completeCardRoomItems', () => {
  it('defaults to 10 basketball-card tiles in 2 rows of 5, with no TCG', () => {
    expect(DEFAULT_CARD_ROOM_ITEMS).toHaveLength(CARD_ROOM_COUNT);
    const names = DEFAULT_CARD_ROOM_ITEMS.map((i) => i.name);
    expect(names.slice(0, 6)).toEqual(['Jordan', 'Kobe', 'Curry', 'Rookies', 'Top 100', 'Wembanyama']);
    expect(names.slice(6)).toEqual(['Signed', 'Prizm', 'Under $50', 'Panini']);
    expect(names.join(' ')).not.toMatch(/pok[eé]mon|yu-?gi-?oh|magic|one piece/i);
    expect(DEFAULT_CARD_ROOM_ITEMS.every((i) => i.href.startsWith('/cards'))).toBe(true);
  });

  it('pads a published 6-item Card Room with the four new tiles', () => {
    const published = DEFAULT_CARD_ROOM_ITEMS.slice(0, 6);
    const filled = completeCardRoomItems(published);
    expect(filled).toHaveLength(10);
    expect(filled.slice(0, 6)).toEqual(published);
    expect(filled.slice(6).map((i) => i.name)).toEqual(['Signed', 'Prizm', 'Under $50', 'Panini']);
  });

  it('does not duplicate or truncate an already-complete list', () => {
    expect(completeCardRoomItems(DEFAULT_CARD_ROOM_ITEMS).map((i) => i.name)).toEqual(
      DEFAULT_CARD_ROOM_ITEMS.map((i) => i.name),
    );
    const extra = [...DEFAULT_CARD_ROOM_ITEMS, { id: 'c11', name: 'LeBron', href: '/cards?q=LeBron' }];
    expect(completeCardRoomItems(extra)).toHaveLength(11);
  });
});

describe('default Card Room links', () => {
  // How the /cards grid reads each tile's link (the same parser it uses on the URL).
  const filters = (href: string) => parseFilterSearchParams(new URL(href, 'https://benched.au').searchParams);
  const cardSubCategories = new Set(
    (MARKETPLACE_CATEGORIES.find((c) => c.name === 'Collector Cards')?.subcategories || []).map((s) => s.name),
  );

  it('player and rookie tiles search titles instead of an exact sub-category tag', () => {
    const byName = Object.fromEntries(DEFAULT_CARD_ROOM_ITEMS.map((i) => [i.name, filters(i.href)]));
    expect(byName.Jordan).toMatchObject({ q: 'Jordan' });
    expect(byName.Kobe).toMatchObject({ q: 'Kobe' });
    expect(byName.Curry).toMatchObject({ q: 'Curry' });
    expect(byName.Wembanyama).toMatchObject({ q: 'Wembanyama' });
    expect(byName.Rookies).toMatchObject({ q: 'Rookie' });
    for (const f of [byName.Jordan, byName.Kobe, byName.Curry, byName.Wembanyama, byName.Rookies]) {
      expect(f.subCategory).toBeUndefined();
    }
  });

  it('any sub-category a tile filters on is a real Collector Cards sub-category', () => {
    for (const item of DEFAULT_CARD_ROOM_ITEMS) {
      const sub = filters(item.href).subCategory;
      if (sub) expect(cardSubCategories.has(sub), `${item.name} -> ${sub}`).toBe(true);
    }
  });

  it('the Under $50 tile is read as a price filter', () => {
    const under50 = DEFAULT_CARD_ROOM_ITEMS.find((i) => i.name === 'Under $50')!;
    expect(filters(under50.href).priceRange).toEqual([0, 50]);
  });
});
