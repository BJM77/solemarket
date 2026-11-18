import { describe, it, expect } from 'vitest';
import { POPULAR_LISTINGS_COUNT, pickPopularListings } from './popular-listings';

const items = (ids: string[], views: number[] = []) =>
  ids.map((id, i) => ({ id, views: views[i] ?? 0 }));

describe('pickPopularListings', () => {
  it('takes 15 highest-viewed items that are not already in Just Listed', () => {
    const ids = Array.from({ length: 20 }, (_, i) => `p${i}`);
    const views = ids.map((_, i) => 20 - i);
    const justListed = ['p0', 'p1', 'p2'];
    const picked = pickPopularListings(items(ids, views), justListed);
    expect(picked).toHaveLength(POPULAR_LISTINGS_COUNT);
    expect(picked.map((p) => p.id)).toEqual(Array.from({ length: 15 }, (_, i) => `p${i + 3}`));
  });

  it('backfills from Just Listed when unique popular items would leave a short last row', () => {
    const ids = Array.from({ length: 15 }, (_, i) => `p${i}`);
    const views = ids.map((_, i) => 15 - i);
    const picked = pickPopularListings(items(ids, views), ['p0', 'p1', 'p2']);
    expect(picked).toHaveLength(15);
    expect(picked.map((p) => p.id).slice(0, 12)).toEqual(Array.from({ length: 12 }, (_, i) => `p${i + 3}`));
    expect(picked.map((p) => p.id).slice(12)).toEqual(['p0', 'p1', 'p2']);
  });

  it('breaks view ties with the original (newest-first) order', () => {
    const picked = pickPopularListings(items(['new', 'old'], [4, 4]), []);
    expect(picked.map((p) => p.id)).toEqual(['new', 'old']);
  });

  it('returns fewer than 15 when the catalog is smaller', () => {
    expect(pickPopularListings(items(['a', 'b']), []).map((p) => p.id)).toEqual(['a', 'b']);
  });

  it('drops duplicate candidates', () => {
    const picked = pickPopularListings(
      [{ id: 'a', views: 5 }, { id: 'a', views: 99 }, { id: 'b', views: 1 }],
      [],
    );
    expect(picked.map((p) => p.id)).toEqual(['a', 'b']);
  });
});
