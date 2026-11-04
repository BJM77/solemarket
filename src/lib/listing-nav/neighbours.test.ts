import { describe, it, expect } from 'vitest';
import { listingIdFromPath, neighboursFromList } from './index';

describe('listing nav', () => {
  it('parses listing ids', () => {
    expect(listingIdFromPath('/cards/some-card/abc123')).toBe('abc123');
    expect(listingIdFromPath('/product/xyz')).toBe('xyz');
    expect(listingIdFromPath('/browse')).toBeNull();
    expect(listingIdFromPath('/cards/foo')).toBeNull();
  });
  it('finds neighbours and ends', () => {
    const l = [{ id: 'a', url: '/u/a' }, { id: 'b', url: '/u/b' }, { id: 'c', url: '/u/c' }];
    expect(neighboursFromList(l, 'a')).toMatchObject({ prev: null, next: '/u/b' });
    expect(neighboursFromList(l, 'b')).toMatchObject({ prev: '/u/a', next: '/u/c' });
    expect(neighboursFromList(l, 'c')).toMatchObject({ prev: '/u/b', next: null });
    expect(neighboursFromList(l, 'z')).toBeNull();
  });
});
