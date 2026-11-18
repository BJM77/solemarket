import { describe, it, expect } from 'vitest';
import { JUST_LISTED_COUNT, pickJustListed } from './just-listed';

const items = (ids: string[]) => ids.map((id) => ({ id }));

describe('pickJustListed', () => {
  it('takes the 15 newest items', () => {
    const newest = items(Array.from({ length: 20 }, (_, i) => `n${i}`));
    const picked = pickJustListed(newest);
    expect(picked).toHaveLength(JUST_LISTED_COUNT);
    expect(picked.map((p) => p.id)).toEqual(Array.from({ length: 15 }, (_, i) => `n${i}`));
  });

  it('returns fewer than 15 when the catalog is smaller', () => {
    expect(pickJustListed(items(['a', 'b', 'c'])).map((p) => p.id)).toEqual(['a', 'b', 'c']);
  });
});
