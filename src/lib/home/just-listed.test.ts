import { describe, it, expect } from 'vitest';
import { JUST_LISTED_COUNT, pickJustListed } from './just-listed';

const items = (ids: string[]) => ids.map((id) => ({ id }));

describe('pickJustListed', () => {
  it('takes 15 newest items that are not already in Popular Listings', () => {
    const newest = items(Array.from({ length: 20 }, (_, i) => `n${i}`));
    const featured = ['n0', 'n1', 'n2'];
    const picked = pickJustListed(newest, featured);
    expect(picked).toHaveLength(JUST_LISTED_COUNT);
    expect(picked.map((p) => p.id)).toEqual(Array.from({ length: 15 }, (_, i) => `n${i + 3}`));
  });

  it('fills from the newest overall when excluding featured would leave a short last row', () => {
    const newest = items(Array.from({ length: 15 }, (_, i) => `n${i}`));
    const featured = ['n0', 'n1', 'n2'];
    const picked = pickJustListed(newest, featured);
    expect(picked.map((p) => p.id)).toEqual(Array.from({ length: 15 }, (_, i) => `n${i}`));
  });

  it('returns fewer than 15 when the catalog is smaller', () => {
    expect(pickJustListed(items(['a', 'b', 'c']), []).map((p) => p.id)).toEqual(['a', 'b', 'c']);
  });
});
