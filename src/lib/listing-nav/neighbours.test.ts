import { describe, it, expect } from 'vitest';
import { listingIdFromPath } from './index';

describe('listing nav', () => {
  it('parses listing ids', () => {
    expect(listingIdFromPath('/cards/some-card/abc123')).toBe('abc123');
    expect(listingIdFromPath('/product/xyz')).toBe('xyz');
    expect(listingIdFromPath('/browse')).toBeNull();
    expect(listingIdFromPath('/cards/foo')).toBeNull();
  });
});
