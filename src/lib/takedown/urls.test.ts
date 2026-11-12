import { describe, expect, it } from 'vitest';
import { extractProductIdFromUrl } from './urls';

describe('extractProductIdFromUrl', () => {
  it('reads an id from absolute and relative listing URLs', () => {
    expect(extractProductIdFromUrl('https://benched.au/product/abc123')).toBe('abc123');
    expect(extractProductIdFromUrl('/product/abc123?ref=1')).toBe('abc123');
    expect(extractProductIdFromUrl('not a url')).toBeNull();
  });
});
