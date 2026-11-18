import { describe, it, expect } from 'vitest';
import { CARD_ROOM_COUNT, DEFAULT_CARD_ROOM_ITEMS, completeCardRoomItems } from './card-room';

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
